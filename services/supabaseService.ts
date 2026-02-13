import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { ServiceRequest, ServiceRequestStatus, CounterProposal, UserRole } from '../types';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient => {
  if (!supabase) {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase configuration. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local');
    }
    supabase = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabase;
};

export const isSupabaseConfigured = (): boolean => {
  return !!(supabaseUrl && supabaseAnonKey);
};

// ── Auth ──

export const signInAnonymously = async (): Promise<string | null> => {
  const client = getSupabaseClient();
  const { data, error } = await client.auth.signInAnonymously();
  if (error) {
    console.error('Anonymous sign-in failed:', error);
    return null;
  }
  return data.user?.id ?? null;
};

export const getSessionUserId = async (): Promise<string | null> => {
  const client = getSupabaseClient();
  const { data: { session } } = await client.auth.getSession();
  return session?.user?.id ?? null;
};

// ── Users ──

export interface SupabaseUser {
  id: string;
  device_id: string;
  role: UserRole;
  name: string;
  company_name: string;
  contact_phone: string;
  created_at: string;
}

export const registerUser = async (
  deviceId: string,
  role: UserRole,
  name: string,
  companyName?: string,
  contactPhone?: string
): Promise<SupabaseUser | null> => {
  const client = getSupabaseClient();
  const userId = await getSessionUserId();
  if (!userId) return null;

  const { data, error } = await client
    .from('users')
    .upsert({
      id: userId,
      device_id: deviceId,
      role,
      name,
      company_name: companyName || '',
      contact_phone: contactPhone || '',
    }, { onConflict: 'device_id' })
    .select()
    .single();

  if (error) {
    console.error('User registration failed:', error);
    return null;
  }
  return data;
};

export const getUser = async (deviceId: string): Promise<SupabaseUser | null> => {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('users')
    .select('*')
    .eq('device_id', deviceId)
    .single();

  if (error) return null;
  return data;
};

// ── Service Requests ──

interface ServiceRequestRow {
  id: string;
  created_at: string;
  updated_at: string;
  driver_name: string;
  contact_phone: string;
  fleet_name: string;
  service_type: string;
  urgency: string;
  location: Record<string, unknown>;
  vehicle_type: string;
  tire_info: Record<string, unknown> | null;
  mechanical_info: Record<string, unknown> | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  status: string;
  assigned_provider_id: string | null;
  assigned_provider_name: string | null;
  created_by_id: string;
  submitted_at: string | null;
  accepted_at: string | null;
  completed_at: string | null;
  conversation_transcript: string | null;
}

const rowToServiceRequest = (row: ServiceRequestRow): ServiceRequest => ({
  id: row.id,
  timestamp: new Date(row.created_at),
  driver_name: row.driver_name,
  contact_phone: row.contact_phone,
  fleet_name: row.fleet_name,
  service_type: row.service_type as ServiceRequest['service_type'],
  urgency: row.urgency as ServiceRequest['urgency'],
  location: row.location as ServiceRequest['location'],
  vehicle: { vehicle_type: row.vehicle_type as ServiceRequest['vehicle']['vehicle_type'] },
  tire_info: row.tire_info as ServiceRequest['tire_info'],
  mechanical_info: row.mechanical_info as ServiceRequest['mechanical_info'],
  scheduled_appointment: row.scheduled_date && row.scheduled_time
    ? { scheduled_date: row.scheduled_date, scheduled_time: row.scheduled_time }
    : undefined,
  status: row.status as ServiceRequestStatus,
  conversation_transcript: row.conversation_transcript ?? undefined,
  assigned_provider_id: row.assigned_provider_id ?? undefined,
  assigned_provider_name: row.assigned_provider_name ?? undefined,
  created_by_id: row.created_by_id,
  submitted_at: row.submitted_at ?? undefined,
  accepted_at: row.accepted_at ?? undefined,
  completed_at: row.completed_at ?? undefined,
});

const serviceRequestToRow = (request: ServiceRequest) => ({
  id: request.id,
  driver_name: request.driver_name,
  contact_phone: request.contact_phone,
  fleet_name: request.fleet_name,
  service_type: request.service_type,
  urgency: request.urgency,
  location: request.location,
  vehicle_type: request.vehicle?.vehicle_type || '',
  tire_info: request.tire_info || null,
  mechanical_info: request.mechanical_info || null,
  scheduled_date: request.scheduled_appointment?.scheduled_date || null,
  scheduled_time: request.scheduled_appointment?.scheduled_time || null,
  status: request.status,
  assigned_provider_id: request.assigned_provider_id || null,
  assigned_provider_name: request.assigned_provider_name || null,
  created_by_id: request.created_by_id || '',
  submitted_at: request.submitted_at || null,
  accepted_at: request.accepted_at || null,
  completed_at: request.completed_at || null,
  conversation_transcript: request.conversation_transcript || null,
});

export const submitServiceRequest = async (request: ServiceRequest): Promise<ServiceRequest | null> => {
  const client = getSupabaseClient();
  const userId = await getSessionUserId();
  if (!userId) return null;

  const row = serviceRequestToRow({
    ...request,
    status: 'submitted',
    created_by_id: userId,
    submitted_at: new Date().toISOString(),
  });

  const { data, error } = await client
    .from('service_requests')
    .insert(row)
    .select()
    .single();

  if (error) {
    console.error('Submit service request failed:', error);
    return null;
  }
  return rowToServiceRequest(data);
};

export const getServiceRequests = async (filters?: {
  status?: ServiceRequestStatus | ServiceRequestStatus[];
  urgency?: string;
  createdBy?: string;
}): Promise<ServiceRequest[]> => {
  const client = getSupabaseClient();
  let query = client.from('service_requests').select('*');

  if (filters?.status) {
    if (Array.isArray(filters.status)) {
      query = query.in('status', filters.status);
    } else {
      query = query.eq('status', filters.status);
    }
  }
  if (filters?.urgency) {
    query = query.eq('urgency', filters.urgency);
  }
  if (filters?.createdBy) {
    query = query.eq('created_by_id', filters.createdBy);
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;
  if (error) {
    console.error('Get service requests failed:', error);
    return [];
  }
  return (data || []).map(rowToServiceRequest);
};

export const getServiceRequest = async (id: string): Promise<ServiceRequest | null> => {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('service_requests')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Get service request failed:', error);
    return null;
  }
  return rowToServiceRequest(data);
};

export const acceptServiceRequest = async (
  id: string,
  providerId: string,
  providerName: string
): Promise<boolean> => {
  const client = getSupabaseClient();
  const { error } = await client
    .from('service_requests')
    .update({
      status: 'accepted',
      assigned_provider_id: providerId,
      assigned_provider_name: providerName,
      accepted_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    console.error('Accept service request failed:', error);
    return false;
  }
  return true;
};

export const rejectServiceRequest = async (id: string): Promise<boolean> => {
  const client = getSupabaseClient();
  const { error } = await client
    .from('service_requests')
    .update({ status: 'rejected' })
    .eq('id', id);

  if (error) {
    console.error('Reject service request failed:', error);
    return false;
  }
  return true;
};

// ── Counter Proposals ──

export const createCounterProposal = async (
  requestId: string,
  providerId: string,
  providerName: string,
  proposedDate: string,
  proposedTime: string,
  message: string
): Promise<boolean> => {
  const client = getSupabaseClient();

  // Insert counter proposal
  const { error: cpError } = await client
    .from('counter_proposals')
    .insert({
      service_request_id: requestId,
      provider_id: providerId,
      provider_name: providerName,
      proposed_date: proposedDate,
      proposed_time: proposedTime,
      message,
    });

  if (cpError) {
    console.error('Create counter proposal failed:', cpError);
    return false;
  }

  // Update service request status
  const { error: srError } = await client
    .from('service_requests')
    .update({
      status: 'counter_proposed',
      assigned_provider_id: providerId,
      assigned_provider_name: providerName,
    })
    .eq('id', requestId);

  if (srError) {
    console.error('Update service request status failed:', srError);
    return false;
  }
  return true;
};

export const getCounterProposals = async (requestId: string): Promise<CounterProposal[]> => {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('counter_proposals')
    .select('*')
    .eq('service_request_id', requestId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Get counter proposals failed:', error);
    return [];
  }
  return data || [];
};

export const approveCounterProposal = async (
  proposalId: string,
  requestId: string
): Promise<boolean> => {
  const client = getSupabaseClient();

  // Get the proposal to extract proposed date/time
  const { data: proposal, error: fetchError } = await client
    .from('counter_proposals')
    .select('*')
    .eq('id', proposalId)
    .single();

  if (fetchError || !proposal) {
    console.error('Fetch counter proposal failed:', fetchError);
    return false;
  }

  // Update counter proposal status
  const { error: cpError } = await client
    .from('counter_proposals')
    .update({
      status: 'approved',
      responded_at: new Date().toISOString(),
    })
    .eq('id', proposalId);

  if (cpError) {
    console.error('Approve counter proposal failed:', cpError);
    return false;
  }

  // Update service request with new schedule and status
  const { error: srError } = await client
    .from('service_requests')
    .update({
      status: 'counter_approved',
      scheduled_date: proposal.proposed_date,
      scheduled_time: proposal.proposed_time,
    })
    .eq('id', requestId);

  if (srError) {
    console.error('Update service request failed:', srError);
    return false;
  }
  return true;
};

export const rejectCounterProposal = async (
  proposalId: string,
  requestId: string
): Promise<boolean> => {
  const client = getSupabaseClient();

  // Update counter proposal status
  const { error: cpError } = await client
    .from('counter_proposals')
    .update({
      status: 'rejected',
      responded_at: new Date().toISOString(),
    })
    .eq('id', proposalId);

  if (cpError) {
    console.error('Reject counter proposal failed:', cpError);
    return false;
  }

  // Revert service request to submitted so other providers can see it
  const { error: srError } = await client
    .from('service_requests')
    .update({
      status: 'counter_rejected',
      assigned_provider_id: null,
      assigned_provider_name: null,
    })
    .eq('id', requestId);

  if (srError) {
    console.error('Revert service request failed:', srError);
    return false;
  }
  return true;
};

// ── Real-Time Subscriptions ──

export const subscribeToServiceRequests = (
  callback: (payload: unknown) => void
): RealtimeChannel => {
  const client = getSupabaseClient();
  return client
    .channel('service-requests-changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'service_requests',
    }, callback)
    .subscribe();
};

export const subscribeToMyRequests = (
  userId: string,
  callback: (payload: unknown) => void
): RealtimeChannel => {
  const client = getSupabaseClient();
  return client
    .channel('my-requests-changes')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'service_requests',
      filter: `created_by_id=eq.${userId}`,
    }, callback)
    .subscribe();
};

export const subscribeToCounterProposals = (
  requestIds: string[],
  callback: (payload: unknown) => void
): RealtimeChannel => {
  const client = getSupabaseClient();
  return client
    .channel('counter-proposals-changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'counter_proposals',
    }, callback)
    .subscribe();
};

export const unsubscribe = (channel: RealtimeChannel): void => {
  const client = getSupabaseClient();
  client.removeChannel(channel);
};

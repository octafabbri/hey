import { ServiceRequest, UserProfile, VehicleType, ServiceType, ServiceUrgency, LocationInfo, VehicleInfo } from '../types';

/**
 * Creates a new service request in draft status with a unique ID
 */
export const createServiceRequest = (): ServiceRequest => {
  return {
    id: crypto.randomUUID(),
    timestamp: new Date(),
    driver_name: '',
    contact_phone: '',
    service_type: '' as ServiceType,
    urgency: '' as ServiceUrgency,
    description: '',
    location: {} as LocationInfo,
    vehicle: {} as VehicleInfo,
    status: 'draft',
  };
};

/**
 * Validates that a service request has all required fields populated
 * Returns completeness status and list of missing fields
 */
export const validateServiceRequest = (request: ServiceRequest): {
  isComplete: boolean;
  missingFields: string[];
} => {
  const missingFields: string[] = [];

  // Required fields - Basic Info
  if (!request.driver_name || request.driver_name.trim() === '') {
    missingFields.push('driver_name');
  }
  if (!request.contact_phone || request.contact_phone.trim() === '') {
    missingFields.push('contact_phone');
  }

  // Required fields - Service Details
  if (!request.service_type) {
    missingFields.push('service_type');
  }
  if (!request.urgency) {
    missingFields.push('urgency');
  }
  if (!request.description || request.description.trim() === '') {
    missingFields.push('description');
  }

  // Required fields - Location (all details)
  if (!request.location.current_location || request.location.current_location.trim() === '') {
    missingFields.push('location.current_location');
  }
  if (request.location.is_safe_location === undefined || request.location.is_safe_location === null) {
    missingFields.push('location.is_safe_location');
  }

  // Required fields - Vehicle (detailed info for dispatch)
  if (!request.vehicle.vehicle_type) {
    missingFields.push('vehicle.vehicle_type');
  }
  if (!request.vehicle.make || request.vehicle.make.trim() === '') {
    missingFields.push('vehicle.make');
  }
  if (!request.vehicle.model || request.vehicle.model.trim() === '') {
    missingFields.push('vehicle.model');
  }
  if (!request.vehicle.year || request.vehicle.year.trim() === '') {
    missingFields.push('vehicle.year');
  }

  // Required fields - Scheduled Appointment (only for SCHEDULED urgency)
  if (request.urgency === 'SCHEDULED') {
    if (!request.scheduled_appointment) {
      missingFields.push('scheduled_appointment');
    } else {
      if (!request.scheduled_appointment.scheduled_date || request.scheduled_appointment.scheduled_date.trim() === '') {
        missingFields.push('scheduled_appointment.scheduled_date');
      }
      if (!request.scheduled_appointment.scheduled_time || request.scheduled_appointment.scheduled_time.trim() === '') {
        missingFields.push('scheduled_appointment.scheduled_time');
      }
      if (!request.scheduled_appointment.scheduled_location || request.scheduled_appointment.scheduled_location.trim() === '') {
        missingFields.push('scheduled_appointment.scheduled_location');
      }
    }
  }

  return {
    isComplete: missingFields.length === 0,
    missingFields,
  };
};

/**
 * Adds a completed service request to the user profile
 * Follows the pattern of addMoodEntry from userProfileService.ts
 */
export const addServiceRequest = (
  profile: UserProfile,
  request: ServiceRequest
): UserProfile => {
  const updatedRequests = [...(profile.serviceRequests || []), request];
  return { ...profile, serviceRequests: updatedRequests };
};

/**
 * Updates an existing service request in the user profile
 */
export const updateServiceRequest = (
  profile: UserProfile,
  requestId: string,
  updates: Partial<ServiceRequest>
): UserProfile => {
  const updatedRequests = profile.serviceRequests.map(req =>
    req.id === requestId ? { ...req, ...updates } : req
  );
  return { ...profile, serviceRequests: updatedRequests };
};

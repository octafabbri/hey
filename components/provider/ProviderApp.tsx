import React, { useState } from 'react';
import { ServiceRequest } from '../../types';
import { BottomMenuBar } from '../BottomMenuBar';
import { ProviderDashboard } from './ProviderDashboard';
import { WorkOrderDetail } from './WorkOrderDetail';
import { CounterProposalForm } from './CounterProposalForm';
import { ActiveJobs } from './ActiveJobs';
import { ProviderSettings } from './ProviderSettings';
import { useSupabaseAuth } from '../../hooks/useSupabaseAuth';
import {
  isSupabaseConfigured,
  acceptServiceRequest,
  rejectServiceRequest,
  createCounterProposal,
} from '../../services/supabaseService';

type ProviderTab = 'dashboard' | 'active' | 'settings';
type ProviderView = 'list' | 'detail' | 'counter-propose';

interface ProviderAppProps {
  onSwitchRole: () => void;
}

export const ProviderApp: React.FC<ProviderAppProps> = ({ onSwitchRole }) => {
  const [currentTab, setCurrentTab] = useState<ProviderTab>('dashboard');
  const [currentView, setCurrentView] = useState<ProviderView>('list');
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const isDark = false; // Match fleet: always light mode
  const { userId } = useSupabaseAuth();

  const handleSelectRequest = (request: ServiceRequest) => {
    setSelectedRequest(request);
    setCurrentView('detail');
  };

  const handleBack = () => {
    setCurrentView('list');
    setSelectedRequest(null);
  };

  const handleAccept = async (request: ServiceRequest) => {
    if (!isSupabaseConfigured() || !userId) return;

    try {
      await acceptServiceRequest(request.id, userId, 'Provider');
      handleBack();
    } catch (err) {
      console.error('Failed to accept request:', err);
    }
  };

  const handleReject = async (request: ServiceRequest) => {
    if (!isSupabaseConfigured()) return;

    try {
      await rejectServiceRequest(request.id);
      handleBack();
    } catch (err) {
      console.error('Failed to reject request:', err);
    }
  };

  const handleCounterPropose = (request: ServiceRequest) => {
    setSelectedRequest(request);
    setCurrentView('counter-propose');
  };

  const handleSubmitCounterProposal = async (data: {
    proposed_date: string;
    proposed_time: string;
    message: string;
  }) => {
    if (!isSupabaseConfigured() || !selectedRequest || !userId) return;

    try {
      await createCounterProposal(selectedRequest.id, {
        provider_id: userId,
        provider_name: 'Provider',
        proposed_date: data.proposed_date,
        proposed_time: data.proposed_time,
        message: data.message,
      });
      handleBack();
    } catch (err) {
      console.error('Failed to submit counter-proposal:', err);
    }
  };

  const handleNavigate = (tab: string) => {
    setCurrentTab(tab as ProviderTab);
    setCurrentView('list');
    setSelectedRequest(null);
  };

  const renderContent = () => {
    // Detail / counter-propose views (overlay on any tab)
    if (currentView === 'detail' && selectedRequest) {
      return (
        <WorkOrderDetail
          request={selectedRequest}
          isDark={isDark}
          onBack={handleBack}
          onAccept={handleAccept}
          onReject={handleReject}
          onCounterPropose={handleCounterPropose}
        />
      );
    }

    if (currentView === 'counter-propose' && selectedRequest) {
      return (
        <CounterProposalForm
          request={selectedRequest}
          isDark={isDark}
          onBack={() => setCurrentView('detail')}
          onSubmit={handleSubmitCounterProposal}
        />
      );
    }

    // Tab views
    switch (currentTab) {
      case 'dashboard':
        return (
          <ProviderDashboard
            isDark={isDark}
            onSelectRequest={handleSelectRequest}
          />
        );
      case 'active':
        return (
          <ActiveJobs
            isDark={isDark}
            providerId={userId || ''}
            onSelectRequest={handleSelectRequest}
          />
        );
      case 'settings':
        return <ProviderSettings isDark={isDark} onSwitchRole={onSwitchRole} />;
      default:
        return null;
    }
  };

  return (
    <>
      {renderContent()}
      <BottomMenuBar
        isDark={isDark}
        role="provider"
        onNavigate={handleNavigate}
      />
    </>
  );
};

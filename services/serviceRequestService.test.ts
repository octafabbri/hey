import { describe, it, expect } from 'vitest';
import {
  createServiceRequest,
  validateServiceRequest,
  addServiceRequest,
  updateServiceRequest,
} from './serviceRequestService';
import { ServiceRequest, UserProfile, ServiceType, ServiceUrgency, VehicleType } from '../types';

describe('serviceRequestService', () => {
  describe('createServiceRequest', () => {
    it('should create a new service request with draft status', () => {
      const request = createServiceRequest();

      expect(request).toBeDefined();
      expect(request.id).toBeDefined();
      expect(request.status).toBe('draft');
      expect(request.timestamp).toBeInstanceOf(Date);
    });

    it('should create unique IDs for each request', () => {
      const request1 = createServiceRequest();
      const request2 = createServiceRequest();

      expect(request1.id).not.toBe(request2.id);
    });
  });

  describe('validateServiceRequest', () => {
    const createValidRequest = (): ServiceRequest => ({
      id: '123',
      timestamp: new Date(),
      driver_name: 'John Doe',
      contact_phone: '555-1234',
      service_type: ServiceType.TOWING,
      urgency: ServiceUrgency.ERS,
      description: 'Engine failure',
      location: {
        current_location: 'I-80 Mile 145',
        is_safe_location: false,
      },
      vehicle: {
        vehicle_type: VehicleType.TRUCK,
        make: 'Freightliner',
        model: 'Cascadia',
        year: '2020',
      },
      status: 'draft',
    });

    it('should validate a complete service request', () => {
      const request = createValidRequest();
      const result = validateServiceRequest(request);

      expect(result.isComplete).toBe(true);
      expect(result.missingFields).toHaveLength(0);
    });

    it('should detect missing driver name', () => {
      const request = createValidRequest();
      request.driver_name = '';

      const result = validateServiceRequest(request);

      expect(result.isComplete).toBe(false);
      expect(result.missingFields).toContain('driver_name');
    });

    it('should detect missing phone number', () => {
      const request = createValidRequest();
      request.contact_phone = '';

      const result = validateServiceRequest(request);

      expect(result.isComplete).toBe(false);
      expect(result.missingFields).toContain('contact_phone');
    });

    it('should detect missing vehicle information', () => {
      const request = createValidRequest();
      request.vehicle.make = '';
      request.vehicle.model = '';

      const result = validateServiceRequest(request);

      expect(result.isComplete).toBe(false);
      expect(result.missingFields).toContain('vehicle.make');
      expect(result.missingFields).toContain('vehicle.model');
    });

    it('should require scheduled appointment details for SCHEDULED urgency', () => {
      const request = createValidRequest();
      request.urgency = ServiceUrgency.SCHEDULED;

      const result = validateServiceRequest(request);

      expect(result.isComplete).toBe(false);
      expect(result.missingFields).toContain('scheduled_appointment');
    });

    it('should validate scheduled appointment when provided', () => {
      const request = createValidRequest();
      request.urgency = ServiceUrgency.SCHEDULED;
      request.scheduled_appointment = {
        scheduled_date: '2024-02-15',
        scheduled_time: '10:00 AM',
        scheduled_location: 'Main Street Garage',
      };

      const result = validateServiceRequest(request);

      expect(result.isComplete).toBe(true);
      expect(result.missingFields).toHaveLength(0);
    });
  });

  describe('addServiceRequest', () => {
    it('should add a service request to user profile', () => {
      const profile: UserProfile = {
        userName: 'Test User',
        voiceOutput: {
          enabled: true,
          rate: 1,
          pitch: 1,
          volume: 1,
          voiceURI: 'onyx',
        },
        voiceInput: {
          language: 'en-US',
        },
        moodHistory: [],
        serviceRequests: [],
      };

      const request = createServiceRequest();
      request.driver_name = 'John Doe';
      request.status = 'submitted';

      const updatedProfile = addServiceRequest(profile, request);

      expect(updatedProfile.serviceRequests).toHaveLength(1);
      expect(updatedProfile.serviceRequests[0]).toBe(request);
      expect(profile.serviceRequests).toHaveLength(0); // Original not mutated
    });
  });

  describe('updateServiceRequest', () => {
    it('should update an existing service request', () => {
      const profile: UserProfile = {
        userName: 'Test User',
        voiceOutput: {
          enabled: true,
          rate: 1,
          pitch: 1,
          volume: 1,
          voiceURI: 'onyx',
        },
        voiceInput: {
          language: 'en-US',
        },
        moodHistory: [],
        serviceRequests: [
          {
            id: '123',
            timestamp: new Date(),
            driver_name: 'John Doe',
            contact_phone: '555-1234',
            service_type: ServiceType.TOWING,
            urgency: ServiceUrgency.ERS,
            description: 'Engine failure',
            location: {
              current_location: 'I-80 Mile 145',
            },
            vehicle: {
              vehicle_type: VehicleType.TRUCK,
            },
            status: 'draft',
          },
        ],
      };

      const updatedProfile = updateServiceRequest(profile, '123', {
        status: 'submitted',
        contact_phone: '555-5678',
      });

      expect(updatedProfile.serviceRequests[0].status).toBe('submitted');
      expect(updatedProfile.serviceRequests[0].contact_phone).toBe('555-5678');
      expect(updatedProfile.serviceRequests[0].driver_name).toBe('John Doe'); // Unchanged
    });
  });
});

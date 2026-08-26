/**
 * Courier Provider Interface Architecture
 * Prepared for future automatic API integrations (Steadfast, Pathao, RedX, Paperfly)
 */

export interface CreateConsignmentPayload {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  district: string;
  area?: string;
  amountToCollect: number;
  itemDescription?: string;
  weightInKg?: number;
  note?: string;
}

export interface ConsignmentResponse {
  success: boolean;
  consignmentId?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  courierStatus?: string;
  error?: string;
  rawResponse?: unknown;
}

export interface TrackingStatusResponse {
  success: boolean;
  trackingNumber: string;
  status: string;
  updatedAt: string;
  timeline?: Array<{
    status: string;
    description: string;
    timestamp: string;
    location?: string;
  }>;
  error?: string;
}

export interface ICourierProvider {
  readonly courierCode: string;
  readonly courierName: string;

  createConsignment(payload: CreateConsignmentPayload): Promise<ConsignmentResponse>;
  trackShipment(trackingNumber: string): Promise<TrackingStatusResponse>;
  cancelConsignment(trackingNumber: string, reason?: string): Promise<{ success: boolean; error?: string }>;
}

/**
 * Default simulated / manual provider implementation
 */
export class ManualCourierProvider implements ICourierProvider {
  constructor(public readonly courierCode: string, public readonly courierName: string) {}

  async createConsignment(payload: CreateConsignmentPayload): Promise<ConsignmentResponse> {
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const tracking = `${this.courierCode.toUpperCase().slice(0, 3)}-${randomSuffix}`;
    return {
      success: true,
      consignmentId: `CS-${randomSuffix}`,
      trackingNumber: tracking,
      courierStatus: "Assigned",
    };
  }

  async trackShipment(trackingNumber: string): Promise<TrackingStatusResponse> {
    return {
      success: true,
      trackingNumber,
      status: "In Transit",
      updatedAt: new Date().toISOString(),
      timeline: [
        {
          status: "Assigned",
          description: "Shipment registered in system",
          timestamp: new Date().toISOString(),
        },
      ],
    };
  }

  async cancelConsignment(): Promise<{ success: boolean; error?: string }> {
    return { success: true };
  }
}

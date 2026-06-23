export interface Message {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp: string;
  ticketCreated?: boolean;
}

export type TicketCategory = 'Billing' | 'Technical Support' | 'Delivery/Order' | 'Account Management' | 'General Feedback';
export type TicketPriority = 'High' | 'Medium' | 'Low';
export type TicketStatus = 'Open' | 'In Progress' | 'Resolved';

export interface Ticket {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  category: TicketCategory;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: string;
  orderId?: string;
}

export interface CallLog {
  id: string;
  customerName: string;
  duration: number; // in seconds
  sentiment: 'Positive' | 'Neutral' | 'Negative';
  category: TicketCategory;
  summary: string;
  timestamp: string;
}

export interface CallCenterMetrics {
  totalInquiries: number;
  averageSatisfaction: number; // 1-5 stars
  resolutionRate: number; // percentage
  averageHandlingTime: number; // in seconds
  volumeByCategory: { category: TicketCategory; count: number }[];
  sentimentBreakdown: { positive: number; neutral: number; negative: number };
}

export type UserRole = 'client' | 'restaurant' | 'admin';

export type WhatsappType = 'free' | 'paid';
export type WhatsappProvider = 'twilio' | '360dialog' | 'cloud_api';

export interface WhatsappProAdminConfig {
  provider: WhatsappProvider;
  enabled: boolean;
  costPerMessage: number;
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioFromPhone?: string;
  dialog360ApiKey?: string;
  dialog360FromPhone?: string;
  cloudApiToken?: string;
  cloudApiPhoneNumberId?: string;
  cloudApiBusinessAccountId?: string;
}

export interface WhatsappCreditPlan {
  id: string;
  name: string;
  priceWithoutVat: number;
  sendsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface WhatsappCreditHistory {
  id: string;
  restaurantId: string;
  restaurantName?: string;
  creditsAdded: number;
  planId?: string;
  planName?: string;
  rechargeType: 'manual' | 'purchase';
  amountPaid: number;
  notes?: string;
  createdAt: string;
}

export interface Province {
  id: string;
  name: string;
  createdAt: string;
}

export interface City {
  id: string;
  name: string;
  provinceId: string;
  createdAt: string;
}

export interface SalesRepresentative {
  id: string;
  firstName: string;
  lastName: string;
  dni: string;
  address: string;
  phone: string;
  email: string;
  newClientCommissionPercent: number;
  firstRenewalCommissionPercent: number;
  renewalCommissionPercent: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CuisineType = 
  | 'pizzeria' 
  | 'marisqueria' 
  | 'asador' 
  | 'japonesa' 
  | 'italiana' 
  | 'mediterranea'
  | 'fusion'
  | 'vegetariana'
  | 'sin-gluten'
  | 'tapas'
  | 'other';

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  rating: number;
  totalRatings: number;
  ratingDetails: {
    punctuality: number;
    behavior: number;
    kindness: number;
    education: number;
    tip: number;
  };
  noShowCount?: number;
  isBlocked?: boolean;
  blockedUntil?: string;
  termsAcceptedAt?: string;
  whatsappNotificationsAccepted?: boolean;
  dataStorageAccepted?: boolean;
  ratingAccepted?: boolean;
  createdAt: string;
}

export interface CustomLink {
  url: string;
  buttonText: string;
  enabled: boolean;
}

export interface Module {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  route?: string | null;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  enabledModules: string[];
  allowedDurationIds?: string[];
  isActive: boolean;
  isVisible?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionDuration {
  id: string;
  name: string;
  months: number;
  description?: string;
  isActive: boolean;
  isVisible?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Restaurant {
  id: string;
  name: string;
  description: string;
  username?: string;
  password?: string;
  profileImageUrl?: string;
  googleMapsUrl?: string;
  cuisineType: CuisineType[];
  address: string;
  postalCode?: string;
  cityId: string;
  provinceId: string;
  phone: string[];
  email: string;
  slug: string;
  imageUrl?: string;
  isActive: boolean;
  subscriptionPlanId?: string | null;
  subscriptionExpiry: string | null;
  subscriptionDurationMonths?: number | null;
  enabledModules: string[];
  advanceBookingDays: number;
  customLinks: CustomLink[];
  notificationPhones?: string[];
  notificationEmail?: string;
  whatsappCustomMessage?: string;
  tableRotationTime?: number;
  autoSendWhatsapp?: boolean;
  useWhatsappWeb?: boolean;
  minBookingAdvanceMinutes?: number;
  minModifyCancelMinutes?: number;
  enableEmailNotifications?: boolean;
  reminder1Enabled?: boolean;
  reminder1Hours?: number;
  reminder2Enabled?: boolean;
  reminder2Minutes?: number;
  importantMessageEnabled?: boolean;
  importantMessage?: string;
  whatsappType?: WhatsappType;
  whatsappProCredits?: number;
  whatsappProAlertThreshold?: number;
  availableHighChairs?: number;
  highChairRotationMinutes?: number;
  salesRepId?: string | null;
  createdAt: string;
  updatedAt: string;
  city?: { id: string; name: string };
  province?: { id: string; name: string };
}

export type RestaurantModule = 
  | 'info-config'
  | 'config-pro'
  | 'reservations'
  | 'reservations-pro'
  | 'table-management'
  | 'schedules'
  | 'client-ratings'
  | 'deposits';

export interface TableLocation {
  id: string;
  restaurantId: string;
  name: string;
  imageUrl?: string | null;
  order: number;
  createdAt: string;
}

export interface Table {
  id: string;
  locationId: string;
  restaurantId: string;
  name: string;
  minCapacity: number;
  maxCapacity: number;
  allowsHighChairs: boolean;
  allowsStrollers: boolean;
  allowsPets: boolean;
  priority: number;
  order: number;
  createdAt: string;
}

export interface TableGroup {
  id: string;
  restaurantId: string;
  name: string;
  locationId?: string;
  tableIds: string[];
  minCapacity: number;
  maxCapacity: number;
  priority: number;
  createdAt: string;
}

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface TimeSlot {
  hour: number;
  minute: number;
}

export interface ShiftGroup {
  id: string;
  restaurantId: string;
  name: string;
  timeSlots: TimeSlot[];
  daysOfWeek: DayOfWeek[];
  maxGuestsPerSlot: number;
  minClientRating: number;
  createdAt: string;
}

export interface DaySchedule {
  id: string;
  restaurantId: string;
  date: string;
  isOpen: boolean;
  availableSlots?: {
    time: TimeSlot;
    maxGuests: number;
    minClientRating: number;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface WeeklySchedule {
  id: string;
  restaurantId: string;
  dayOfWeek: DayOfWeek;
  isOpen: boolean;
  availableSlots: {
    time: TimeSlot;
    maxGuests: number;
  }[];
  minClientRating: number;
  createdAt: string;
  updatedAt: string;
}

export type ReservationStatus = 
  | 'pending_confirmation'
  | 'pending'
  | 'confirmed'
  | 'cancelled'
  | 'completed'
  | 'no_show'
  | 'modified'
  | 'añadida';

export interface Reservation {
  id: string;
  restaurantId: string;
  clientId: string;
  date: string;
  time: TimeSlot;
  guests: number;
  locationId: string;
  tableIds: string[];
  needsHighChair: boolean;
  highChairCount?: number;
  needsStroller: boolean;
  hasPets: boolean;
  status: ReservationStatus;
  notes?: string;
  confirmationToken: string;
  isGroup?: boolean;
  groupId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RatingCriteria {
  id: string;
  name: string;
  description: string;
  order: number;
  defaultValue: number;
  isSpecialCriteria: boolean;
  specialCriteriaConfig?: {
    type: 'no-show';
    triggerCount: number;
    blockDurationMonths: number;
  };
  isActive: boolean;
  createdAt: string;
}

export interface ClientRating {
  id: string;
  restaurantId: string;
  clientId: string;
  reservationId: string;
  ratings: {
    criteriaId: string;
    value: number;
  }[];
  privateComment?: string;
  createdAt: string;
}

export interface Admin {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface SearchFilters {
  provinceId?: string;
  cityId?: string;
  cuisineTypes?: CuisineType[];
  searchText?: string;
}

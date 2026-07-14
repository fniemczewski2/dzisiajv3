export interface PhoneItem { type: string; number: string; }
export interface EmailItem { type: string; email: string; }
export interface AddressItem { type: string; address: string; }
export interface SocialLinkItem { platform: string; url: string; }
export interface BusinessData { nip?: string; krs?: string; bank_account?: string; }

export interface VCardProfile {
  id: string;
  user_id: string;
  profile_name: string;
  full_name?: string;
  avatar_url?: string;
  organization?: string;
  phones: PhoneItem[];
  emails: EmailItem[];
  addresses: AddressItem[];
  color_light: string;         
  color_dark: string;
  social_links: SocialLinkItem[];
  business_data: BusinessData;
  is_public: boolean;
  public_slug?: string;
}

export type NewVCardProfile = Omit<VCardProfile, 'id' | 'user_id'>;
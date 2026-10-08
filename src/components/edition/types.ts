export interface PublicPerformer {
  id: string;
  name: string;
  instagram?: string | null;
  youtube?: string | null;
}

export interface PublicTransmission {
  id: string;
  title: string;
  url: string;
  youtubeId?: string | null;
  thumbnailUrl?: string | null;
  kind: 'SET' | 'WORKSHOP' | 'LABS' | 'OTHER';
  performerId?: string | null;
}

export interface PublicEdition {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  eventDate?: string | null;
  venue?: string | null;
  city?: string | null;
  posterUrl?: string | null;
  isLatestRitual?: boolean;
  ticketUrl?: string | null;
  ticketLabel?: string | null;
  hasWorkshop?: boolean;
  workshopTitle?: string | null;
  workshopDescription?: string | null;
  workshopDateTime?: string | null;
  workshopPosterUrl?: string | null;
  workshopTicketUrl?: string | null;
  themeColors?: { primary?: string; secondary?: string } | null;
  isActive: boolean;
  sortOrder: number;
  performers: PublicPerformer[];
  transmissions: PublicTransmission[];
}

export const instagramUrl = (h: string) => `https://instagram.com/${h.replace(/^@/, '')}`;
export const youtubeChannelUrl = (h: string) =>
  h.startsWith('http') ? h : `https://youtube.com/${h.startsWith('@') ? h : `@${h}`}`;

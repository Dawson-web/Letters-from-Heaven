import type { FeaturedLetterRecord } from '@/types/mail'

import { apiRequest } from '@/services/request'

export interface FeaturedLetterPayload {
  featuredLetter: FeaturedLetterRecord | null
  pickedOn: string
}

export function fetchFeaturedLetter() {
  return apiRequest<FeaturedLetterPayload>({
    path: '/api/featured-letter',
  })
}

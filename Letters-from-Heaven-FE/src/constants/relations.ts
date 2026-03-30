import type { LetterDraft, RelationOption } from '@/types/mail'

export const RELATION_OPTIONS: RelationOption[] = [
  '妈妈',
  '爸爸',
  '爷爷',
  '奶奶',
  '外公',
  '外婆',
  '爱人',
  '朋友',
  '其他'
]

export const EMPTY_DRAFT: LetterDraft = {
  title: '',
  body: '',
  relation: '',
  signature: ''
}

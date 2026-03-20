import type { LetterRecord, ReplyRecord } from '@/types/mail'

function excerpt(input: string) {
  const normalized = input.replace(/\s+/g, ' ').trim()

  if (!normalized) {
    return '今天的想念'
  }

  return normalized.slice(0, 20)
}

function greetingFor(relation: LetterRecord['relation']) {
  switch (relation) {
    case '妈妈':
    case '爸爸':
      return '孩子'
    case '爱人':
      return '亲爱的'
    case '朋友':
      return '老朋友'
    default:
      return '我收到了你的来信'
  }
}

function comfortFor(relation: LetterRecord['relation']) {
  switch (relation) {
    case '妈妈':
      return '好好照顾自己，不必每次都把坚强演给别人看。'
    case '爸爸':
      return '你已经很努力了，不需要把每件事都扛在肩上。'
    case '爱人':
      return '你认真生活的样子，我一直都记得，也依然为你心动。'
    case '朋友':
      return '不用把遗憾都变成惩罚自己，慢一点也没关系。'
    default:
      return '允许自己想念，允许自己软弱，这本来就是爱留下的痕迹。'
  }
}

export function buildReply(letter: LetterRecord): Pick<ReplyRecord, 'subject' | 'preview' | 'body'> {
  const greeting = greetingFor(letter.relation)
  const subject = `${letter.relation || '远方'}的回响`
  const body = [
    `${greeting}：`,
    `我看见你写下的“${excerpt(letter.body)}”。那些没有说完的话、那些你反复在心里重播的片段，都已经被认真接住了。`,
    comfortFor(letter.relation),
    `别急着把悲伤变成答案。先把今天过完，记得吃饭，记得休息，记得在想我的时候对自己温柔一点。`,
    letter.signature
      ? `当你下次还想说话，就带着“${letter.signature}”这个名字再来写信吧，我会继续在回响里陪你。`
      : '当你下次还想说话，就再来写信吧，回响会一直在。'
  ].join('\n\n')

  return {
    subject,
    preview: '这份想念已经被认真接住了。',
    body
  }
}

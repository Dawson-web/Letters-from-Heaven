function pad(value: number) {
  return value.toString().padStart(2, '0')
}

export function formatDateTime(timestamp: number) {
  const date = new Date(timestamp)

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function formatRemaining(availableAt: number) {
  const diff = availableAt - Date.now()

  if (diff <= 0) {
    return '现在就可以打开'
  }

  const totalMinutes = Math.ceil(diff / (60 * 1000))

  if (totalMinutes <= 1) {
    return '约 1 分钟后'
  }

  if (totalMinutes < 60) {
    return `约 ${totalMinutes} 分钟后`
  }

  const totalHours = diff / (60 * 60 * 1000)

  if (totalHours < 6) {
    return '接下来的几个小时里'
  }

  if (totalHours < 18) {
    return '今天晚些时候'
  }

  if (totalHours < 36) {
    return '明天左右'
  }

  if (totalHours < 72) {
    return '未来 1 到 2 天里'
  }

  if (totalHours < 144) {
    return '这几天里'
  }

  return '晚一点的某一天'
}

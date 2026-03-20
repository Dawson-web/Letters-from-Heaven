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

  if (totalMinutes < 60) {
    return `约 ${totalMinutes} 分钟后抵达`
  }

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (minutes === 0) {
    return `约 ${hours} 小时后抵达`
  }

  return `约 ${hours} 小时 ${minutes} 分钟后抵达`
}

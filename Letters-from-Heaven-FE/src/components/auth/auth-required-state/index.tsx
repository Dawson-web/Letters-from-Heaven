import { ArcoEmpty } from '@/components/arco/empty'
import Taro from '@tarojs/taro'

interface AuthRequiredStateProps {
  title?: string
  description?: string
  actionText?: string
}

export function AuthRequiredState({
  title = '还差一步边界确认',
  description = '先回到首页看看使用前说明，再决定要不要把这份想念写下来。',
  actionText = '回到首页看看',
}: AuthRequiredStateProps) {
  return (
    <ArcoEmpty
      title={title}
      description={description}
      actionText={actionText}
      onAction={() => Taro.reLaunch({ url: '/pages/home/index' })}
    />
  )
}

import { ArcoEmpty } from '@/components/arco/empty'
import Taro from '@tarojs/taro'

interface AuthRequiredStateProps {
  title?: string
  description?: string
  actionText?: string
}

export function AuthRequiredState({
  title = '还没完成边界确认',
  description = '请先回到首页阅读使用前说明，再开始写信或查看回响。',
  actionText = '回到首页查看',
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

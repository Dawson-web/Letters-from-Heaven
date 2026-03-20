import { ArcoEmpty } from '@/components/arco/empty'
import { navigateToAuthorizationHome } from '@/utils/auth'

interface AuthRequiredStateProps {
  title?: string
  description?: string
}

export function AuthRequiredState({
  title = '还没完成微信授权',
  description = '请先回到首页，通过底部微信授权弹层进入后再使用这里的功能。',
}: AuthRequiredStateProps) {
  return (
    <ArcoEmpty
      title={title}
      description={description}
      actionText='回到首页授权'
      onAction={navigateToAuthorizationHome}
    />
  )
}

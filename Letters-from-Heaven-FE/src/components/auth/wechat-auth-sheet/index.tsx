import { Button, Image, Input, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useState } from 'react'

import { AnimatedView } from '@/components/animation/animated-view'
import { ArcoButton } from '@/components/arco/button'
import type { WechatAuthorizationDraft } from '@/types/user'

interface WechatAuthSheetProps {
  loading?: boolean
  initialAvatarUrl?: string
  initialNickName?: string
  onAuthorize: (payload: WechatAuthorizationDraft) => void | Promise<void>
  onReject: () => void
}

export function WechatAuthSheet({
  loading,
  initialAvatarUrl = '',
  initialNickName = '',
  onAuthorize,
  onReject,
}: WechatAuthSheetProps) {
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl)
  const [nickName, setNickName] = useState(initialNickName)

  useEffect(() => {
    setAvatarUrl(initialAvatarUrl)
  }, [initialAvatarUrl])

  useEffect(() => {
    setNickName(initialNickName)
  }, [initialNickName])

  const handleChooseAvatar = (event: { detail?: { avatarUrl?: string } }) => {
    const nextAvatarUrl = event.detail?.avatarUrl?.trim()

    if (nextAvatarUrl) {
      setAvatarUrl(nextAvatarUrl)
    }
  }

  const handleAuthorize = () => {
    const nextNickName = nickName.trim()

    if (!avatarUrl) {
      Taro.showToast({ title: '请先选择头像', icon: 'none' })
      return
    }

    if (!nextNickName) {
      Taro.showToast({ title: '请先填写昵称', icon: 'none' })
      return
    }

    void onAuthorize({
      avatarUrl,
      nickName: nextNickName,
    })
  }

  return (
    <View className='wechat-auth-gate'>
      <View className='wechat-auth-mask' />

      <AnimatedView animation='fade-in-up' className='wechat-auth-sheet'>
        <View className='wechat-auth-sheet-handle' />

        <View className='wechat-auth-header'>
          <Text className='wechat-auth-title'>允许获取以下信息</Text>
          <Text className='wechat-auth-subtitle'>
            用于补全你的信箱身份资料，未完成前不能进入业务功能
          </Text>
        </View>

        <View className='wechat-auth-avatar-block'>
          <View className='wechat-auth-avatar-picker'>
            {avatarUrl ? (
              <Image className='wechat-auth-preview-avatar' mode='aspectFill' src={avatarUrl} />
            ) : (
              <View className='wechat-auth-preview-avatar'>
                <Text className='wechat-auth-preview-avatar-label'>微</Text>
              </View>
            )}
            <Button
              className='wechat-auth-avatar-hit'
              openType='chooseAvatar'
              onChooseAvatar={handleChooseAvatar}
            />
          </View>

          <Text className='wechat-auth-avatar-tip'>
            {avatarUrl ? '点击头像可重新选择' : '点击选择头像'}
          </Text>
        </View>

        <View className='wechat-auth-field'>
          <Text className='wechat-auth-field-label'>昵称</Text>
          <View className='wechat-auth-nickname-row'>
            <Input
              className='wechat-auth-input'
              type='nickname'
              maxlength={20}
              placeholder='请输入昵称'
              placeholderClass='wechat-auth-input-placeholder'
              value={nickName}
              onInput={(event) => setNickName(event.detail.value)}
            />
          </View>
        </View>

        <View className='wechat-auth-scope'>
          <Text className='wechat-auth-scope-label'>获取你的头像、昵称</Text>
          <Text className='wechat-auth-scope-status'>用于完善资料</Text>
        </View>

        <Text className='wechat-auth-privacy'>
          授权后才可使用写信、收件箱、回响查看等功能
        </Text>

        <View className='mt-6 flex gap-3'>
          <ArcoButton className='flex-1 wechat-auth-cancel-button' variant='outline' onClick={onReject}>
            取消
          </ArcoButton>
          <ArcoButton className='flex-1 wechat-auth-confirm-button' loading={loading} onClick={handleAuthorize}>
            允许
          </ArcoButton>
        </View>
      </AnimatedView>
    </View>
  )
}

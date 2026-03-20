import { PropsWithChildren, useEffect } from 'react'
import { useLaunch } from '@tarojs/taro'

import { StoreProvider, useRootStore } from '@/stores/root-store'

import './app.scss'

function Bootstrap({ children }: PropsWithChildren) {
  const { mailboxStore } = useRootStore()

  useLaunch(() => {
    mailboxStore.hydrate()
  })

  useEffect(() => {
    mailboxStore.refreshReplies()
  }, [mailboxStore])

  return children
}

function App({ children }: PropsWithChildren) {
  return (
    <StoreProvider>
      <Bootstrap>{children}</Bootstrap>
    </StoreProvider>
  )
}

export default App

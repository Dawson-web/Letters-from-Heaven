import { PropsWithChildren } from 'react'

import { StoreProvider, useRootStore } from '@/stores/root-store'

import './app.scss'

function Bootstrap({ children }: PropsWithChildren) {
  const { mailboxStore } = useRootStore()

  if (!mailboxStore.hydrated) {
    mailboxStore.hydrate()
  }

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

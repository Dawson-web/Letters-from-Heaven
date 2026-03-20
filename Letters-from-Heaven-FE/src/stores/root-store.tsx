import { PropsWithChildren, createContext, useContext } from 'react'

import { MailboxStore } from '@/stores/mailbox-store'

const rootStore = {
  mailboxStore: new MailboxStore()
}

const RootStoreContext = createContext(rootStore)

export function StoreProvider({ children }: PropsWithChildren) {
  return (
    <RootStoreContext.Provider value={rootStore}>
      {children}
    </RootStoreContext.Provider>
  )
}

export function useRootStore() {
  return useContext(RootStoreContext)
}

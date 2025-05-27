'use client'

import { ChakraProvider } from '@chakra-ui/react'
import { useEffect, useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div>{children}</div>
  }

  return <ChakraProvider>{children}</ChakraProvider>
}
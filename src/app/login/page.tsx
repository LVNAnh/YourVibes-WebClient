import LoginFeature from '@/components/screens/login/view/LoginFeature'
import React, { Suspense } from 'react'

const LoginPage = () => {
  return (
    <Suspense>
      <LoginFeature />
    </Suspense>
  )
}

export default LoginPage
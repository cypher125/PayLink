"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { motion } from "framer-motion"
import { useAuth } from "@/contexts/AuthContext"
import toast from "@/lib/toast"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const { login } = useAuth()
  const router = useRouter()
  
  useEffect(() => {
    setError(null)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    if (!email || !password) {
      toast.error("Please enter your email and password")
      setIsSubmitting(false)
      return
    }

    try {
      const result = await login({ email, password })
      
      if (result?.success) {
        console.log("Login successful!")
        
        // Use setTimeout to handle navigation properly
        toast.success("Login successful!");
        
        // Use direct window navigation instead of React router for more reliable redirect
        window.location.href = "/dashboard";
      } else {
        setError(result?.message || "Login failed. Please try again.")
      }
    } catch (err: any) {
      console.error("Login error:", err)
      setError(err?.message || "An unexpected error occurred. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white to-gray-100 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-10">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <Link href="/" className="inline-block">
            <div className="flex items-center justify-center space-x-2">
              <div className="h-8 w-8 rounded-full bg-[#0A2357]" />
              <span className="text-2xl font-bold text-[#0A2357]">PayLink</span>
            </div>
          </Link>

          {/* Add register link below the logo */}
          <p className="text-sm text-gray-600">
            Don&apos;t have an account?{" "}
            <Link 
              href="/auth/register" 
              className="text-[#0A2357] hover:text-[#0A2357]/80 font-medium"
            >
              Sign up
            </Link>
          </p>
        </motion.div>

        <motion.form
          onSubmit={handleSubmit}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-md mb-6">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full px-4 py-2"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-4 py-2 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Checkbox 
                id="remember" 
                className="h-4 w-4 rounded border-gray-300" 
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked === true)}
              />
              <label htmlFor="remember" className="ml-2 block text-sm text-gray-700">
                Keep me logged in
              </label>
            </div>
            <Link 
              href="/auth/forgot-password"
              className="text-sm font-medium text-[#0A2357] hover:text-[#1A3B7C] transition-colors"
            >
              Forgot password?
            </Link>
          </div>

          <Button 
            type="submit" 
            className="w-full bg-[#0A2357] hover:bg-[#1A3B7C] text-white transition-colors"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Logging in...
              </>
            ) : (
              "Log in"
            )}
          </Button>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Don&apos;t have an account?{" "}
              <Link 
                href="/auth/register"
                className="font-medium text-[#0A2357] hover:text-[#1A3B7C] transition-colors"
              >
                Sign up
              </Link>
            </p>
          </div>
        </motion.form>

        {/* Security Note */}
        <div className="text-center text-xs text-gray-500 mt-8">
          <p>Protected by reCAPTCHA and subject to the PayLink</p>
          <p className="mt-1">
            <Link href="/privacy-policy" className="underline hover:text-gray-700">Privacy Policy</Link> and{" "}
            <Link href="/terms" className="underline hover:text-gray-700">Terms of Service</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

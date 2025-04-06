"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  Shield, 
  Copy, 
  CheckCheck,
  Calendar,
  MapPin,
  CreditCard,
  Building,
  Loader2
} from "lucide-react"
import Link from "next/link"
import { BottomMenu } from "@/components/BottomMenu"
import { getProfile, getKYCStatus } from "@/lib/api"
import { UserProfile, KYCStatus } from "@/lib/types"
import toast from "@/lib/toast"

export default function ProfilePage() {
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [kycStatus, setKycStatus] = useState<KYCStatus | null>(null)
  
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoading(true)
        
        // Fetch both profile and KYC status in parallel
        const [profileData, kycData] = await Promise.all([
          getProfile(),
          getKYCStatus()
        ])
        
        setUserProfile(profileData)
        setKycStatus(kycData)
      } catch (error) {
        console.error("Error fetching user data:", error)
        // Using setTimeout to avoid React rendering issues with toast
        setTimeout(() => {
          toast.error("Failed to load user profile")
        }, 0)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchUserData()
  }, [])

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  // Get formatted name from profile
  const getFullName = () => {
    if (!userProfile) return ""
    return `${userProfile.first_name || ""} ${userProfile.last_name || ""}`.trim()
  }

  // Get initials from name
  const getInitials = () => {
    const fullName = getFullName()
    if (!fullName) return "U"
    return fullName.split(' ').map(n => n[0]).join('').toUpperCase()
  }

  // Format date if available
  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A"
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-NG', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    } catch {
      return dateString
    }
  }

  // Format date joined
  const getDateJoined = () => {
    if (!userProfile?.date_joined) return "N/A"
    try {
      const date = new Date(userProfile.date_joined)
      return date.toLocaleDateString('en-NG', {
        month: 'long',
        year: 'numeric'
      })
    } catch {
      return "N/A"
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin mx-auto text-[#0A2357]" />
          <p className="mt-4 text-gray-600">Loading your profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 lg:pb-0">
      <header className="bg-white border-b">
        <div className="flex items-center justify-between p-4 lg:px-8 max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-gray-600">
              <ArrowLeft className="h-6 w-6" />
            </Link>
            <h1 className="text-xl font-semibold">Profile</h1>
          </div>
          <Link href="/dashboard/profile/edit">
            <Button variant="outline">Edit Profile</Button>
          </Link>
        </div>
      </header>

      <div className="p-4 lg:p-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Profile Overview Card */}
          <Card className="p-6 rounded-2xl">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-[#0A2357] text-white flex items-center justify-center text-2xl font-semibold">
                {getInitials()}
              </div>
              <div>
                <h2 className="text-xl font-semibold">{getFullName()}</h2>
                <p className="text-gray-500">Joined {getDateJoined()}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-sm text-gray-600">KYC Level</p>
                <p className="text-lg font-semibold text-[#0A2357]">Level {kycStatus?.kyc_level || 1}</p>
              </div>
              <div className="bg-green-50 rounded-xl p-4">
                <p className="text-sm text-gray-600">Account Status</p>
                <p className="text-lg font-semibold text-green-600">
                  {kycStatus?.account_status === 'active' ? 'Active' : 
                   kycStatus?.account_status === 'suspended' ? 'Suspended' : 
                   kycStatus?.account_status === 'inactive' ? 'Inactive' : 'Active'}
                </p>
              </div>
            </div>
          </Card>

          {/* Personal Information */}
          <Card className="p-6 rounded-2xl">
            <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
            <div className="space-y-4">
              {[
                { icon: Mail, label: "Email Address", value: userProfile?.email || "N/A" },
                { icon: Phone, label: "Phone Number", value: userProfile?.phone_number || "N/A" },
                { 
                  icon: Shield, 
                  label: "BVN", 
                  value: userProfile?.bvn ? 
                    `${userProfile.bvn.substring(0, 3)}****${userProfile.bvn.substring(userProfile.bvn.length - 3)}` : 
                    "N/A" 
                },
                { icon: Calendar, label: "Date of Birth", value: formatDate(userProfile?.date_of_birth) },
                { icon: MapPin, label: "Address", value: userProfile?.address || "N/A" },
                { icon: MapPin, label: "State", value: userProfile?.state || "N/A" },
                { icon: User, label: "Occupation", value: userProfile?.occupation || "N/A" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <item.icon className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-600">{item.label}</p>
                    <p className="font-medium">{item.value}</p>
                  </div>
                  {['Email Address', 'Phone Number'].includes(item.label) && item.value !== "N/A" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(item.value, item.label)}
                      className="flex items-center gap-2"
                    >
                      {copiedField === item.label ? (
                        <CheckCheck className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Bank Account Information */}
          <Card className="p-6 rounded-2xl">
            <h3 className="text-lg font-semibold mb-4">Bank Account Information</h3>
            <div className="space-y-4">
              {[
                { icon: Building, label: "Bank Name", value: userProfile?.bank_name || "N/A" },
                { icon: CreditCard, label: "Account Number", value: userProfile?.account_number || "N/A" },
                { icon: CreditCard, label: "Account Name", value: userProfile?.account_name || "N/A" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <item.icon className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-600">{item.label}</p>
                    <p className="font-medium">{item.value}</p>
                  </div>
                  {item.label === 'Account Number' && item.value !== "N/A" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(item.value, item.label)}
                      className="flex items-center gap-2"
                    >
                      {copiedField === item.label ? (
                        <CheckCheck className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </Card>
          
          {kycStatus && kycStatus.kyc_level < 2 && (
            <Card className="p-6 rounded-2xl border-yellow-300 bg-yellow-50">
              <h3 className="text-lg font-semibold mb-2 text-yellow-800">Upgrade Your KYC Level</h3>
              <p className="text-yellow-700 mb-4">
                To unlock more features and higher transaction limits, please provide the following information:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-yellow-700">
                {kycStatus.requirements.missing_fields.map((field, index) => (
                  <li key={index}>{field}</li>
                ))}
              </ul>
              <Link href="/dashboard/profile/edit">
                <Button variant="outline" className="mt-4 border-yellow-500 text-yellow-700 hover:bg-yellow-100">
                  Complete Your Profile
                </Button>
              </Link>
            </Card>
          )}
        </div>
      </div>
      
      <BottomMenu />
    </div>
  )
}

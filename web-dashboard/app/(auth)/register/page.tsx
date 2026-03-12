'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { toast } from 'sonner';
import { CheckCircle2, Mail } from 'lucide-react';

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  confirmPassword: z.string(),
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits').optional().or(z.literal('')),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

type Step = 'details' | 'verify-email' | 'complete';

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<Step>('details');
  const [formData, setFormData] = useState<RegisterFormData | null>(null);
  const [emailOtp, setEmailOtp] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const watchEmail = watch('email');

  const onSubmitDetails = async (data: RegisterFormData) => {
    setFormData(data);
    setError('');
    // Send email OTP
    try {
      setIsLoading(true);
      await api.post('/auth/send-otp', {
        email: data.email,
      });
      toast.success('OTP sent to your email');
      setStep('verify-email');
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const verifyEmailOtp = async () => {
    if (!formData) return;
    setIsLoading(true);
    setError('');

    try {
      await api.post('/auth/verify-otp', {
        email: formData.email,
        otp: emailOtp,
      });
      setEmailVerified(true);
      toast.success('Email verified successfully');

      // Now register the user
      const { confirmPassword, ...registerData } = formData;
      await api.post('/auth/register', registerData);

      setStep('complete');
      setTimeout(() => {
        router.push('/login?registered=true');
      }, 2000);
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Invalid OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const resendOtp = async () => {
    if (!formData) return;
    setIsLoading(true);

    try {
      await api.post('/auth/send-otp', {
        email: formData.email,
      });
      toast.success('OTP resent to your email');
    } catch (err) {
      toast.error('Failed to resend OTP');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">Create an Account</CardTitle>
        <CardDescription className="text-center">
          {step === 'details' && 'Enter your details to get started'}
          {step === 'verify-email' && 'Verify your email address'}
          {step === 'complete' && 'Registration complete!'}
        </CardDescription>

        {/* Progress indicator */}
        <div className="flex justify-center gap-2 pt-2">
          <Badge variant={step === 'details' ? 'default' : 'secondary'}>
            1. Details
          </Badge>
          <Badge variant={step === 'verify-email' ? 'default' : emailVerified ? 'default' : 'secondary'}>
            2. Verify Email {emailVerified && <CheckCircle2 className="ml-1 h-3 w-3" />}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Step 1: Enter details */}
        {step === 'details' && (
          <form onSubmit={handleSubmit(onSubmitDetails)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  placeholder="John"
                  {...register('firstName')}
                />
                {errors.firstName && (
                  <p className="text-sm text-destructive">{errors.firstName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  placeholder="Doe"
                  {...register('lastName')}
                />
                {errors.lastName && (
                  <p className="text-sm text-destructive">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number (Optional)</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+919876543210"
                {...register('phone')}
              />
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone.message}</p>
              )}
              <p className="text-xs text-muted-foreground">Optional. Include country code if provided (e.g., +91 for India)</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Must contain uppercase, lowercase, and number
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>

            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Sending OTP...' : 'Continue'}
            </Button>
          </form>
        )}

        {/* Step 2: Verify email OTP */}
        {step === 'verify-email' && formData && (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <Mail className="h-5 w-5 text-blue-600" />
              <p className="text-sm text-blue-600">
                OTP sent to <strong>{formData.email}</strong>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="emailOtp">Enter Email OTP</Label>
              <Input
                id="emailOtp"
                placeholder="123456"
                value={emailOtp}
                onChange={(e) => setEmailOtp(e.target.value)}
                maxLength={6}
              />
            </div>

            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                {error}
              </div>
            )}

            <Button
              className="w-full"
              onClick={verifyEmailOtp}
              disabled={isLoading || emailOtp.length !== 6}
            >
              {isLoading ? 'Verifying...' : 'Verify Email & Complete Registration'}
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => resendOtp()}
              disabled={isLoading}
            >
              Resend OTP
            </Button>

            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setStep('details')}
            >
              Back
            </Button>
          </div>
        )}

        {/* Step 3: Complete */}
        {step === 'complete' && (
          <div className="text-center space-y-4 py-8">
            <div className="flex justify-center">
              <CheckCircle2 className="h-16 w-16 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold">Registration Complete!</h3>
            <p className="text-muted-foreground">
              Your account has been successfully created and verified.
            </p>
            <p className="text-sm text-muted-foreground">
              Redirecting to login...
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        <div className="text-sm text-center text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="text-primary hover:underline">
            Log in
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}

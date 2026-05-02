'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, KeyRound, Loader2, Save, UserRound } from 'lucide-react';
import { toast } from 'sonner';

import PortalShell from '@/components/PortalShell';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';

function ReadOnlyField({ label, value }) {
  return (
    <div className="space-y-2">
      <Label className="text-slate-600">{label}</Label>
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-200">
        {value || 'Not available'}
      </div>
    </div>
  );
}

export default function StudentProfilePage() {
  const { user, loading, refreshUser } = useAuth();
  const router = useRouter();

  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
      return;
    }

    if (user) {
      setProfileForm({
        name: user.name || '',
        email: user.email || '',
      });
    }
  }, [loading, router, user]);

  const handleProfileChange = (event) => {
    const { name, value } = event.target;
    setProfileForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;
    setPasswordForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    if (!user?.id) return;

    const nextName = profileForm.name.trim();
    const nextEmail = profileForm.email.trim().toLowerCase();

    if (!nextName || !nextEmail) {
      toast.error('Full name and email are required.');
      return;
    }

    setSavingProfile(true);
    try {
      const { error: userTableError } = await supabase
        .from('users')
        .update({
          name: nextName,
          email: nextEmail,
        })
        .eq('id', user.id);

      if (userTableError) {
        throw new Error(userTableError.message || 'Failed to update profile details.');
      }

      if (nextEmail !== (user.email || '').toLowerCase()) {
        const { error: authEmailError } = await supabase.auth.updateUser({
          email: nextEmail,
        });

        if (authEmailError) {
          throw new Error(authEmailError.message || 'Failed to update account email.');
        }
      }

      await refreshUser();
      toast.success('Profile updated successfully.');
    } catch (error) {
      toast.error(error.message || 'Unable to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    const { currentPassword, newPassword, confirmPassword } = passwordForm;

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Complete all password fields.');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }

    setSavingPassword(true);
    try {
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (reauthError) {
        throw new Error('Current password is incorrect.');
      }

      const { error: updatePasswordError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updatePasswordError) {
        throw new Error(updatePasswordError.message || 'Failed to update password.');
      }

      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      toast.success('Password changed successfully.');
    } catch (error) {
      toast.error(error.message || 'Unable to update password.');
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-slate-700" />
          <p className="mt-3 text-sm text-slate-600">Loading profile settings...</p>
        </div>
      </div>
    );
  }

  return (
    <PortalShell
      title="Profile & Settings"
      description="Manage your account details and keep your examination account secure."
      contentClassName="mx-auto max-w-5xl"
    >
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="border-slate-200 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-950/80 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <UserRound className="h-5 w-5" />
              Student Information
            </CardTitle>
            <CardDescription>Core account details used across exams and reports.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ReadOnlyField label="Student ID / Registration Number" value={user?.registration_number} />
            <ReadOnlyField label="Account Role" value={user?.role ? user.role.toUpperCase() : 'STUDENT'} />
            <ReadOnlyField label="Last Known Name" value={user?.name} />
            <ReadOnlyField label="Last Known Email" value={user?.email} />
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-3">
          <Card className="border-slate-200 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                Edit Profile
              </CardTitle>
              <CardDescription>Update your full name and email address.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={saveProfile}>
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    name="name"
                    value={profileForm.name}
                    onChange={handleProfileChange}
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={profileForm.email}
                    onChange={handleProfileChange}
                    placeholder="you@university.edu"
                    required
                  />
                </div>

                <Button type="submit" className="bg-slate-950 text-white hover:bg-slate-800" disabled={savingProfile}>
                  {savingProfile ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Profile
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <KeyRound className="h-5 w-5 text-indigo-600" />
                Change Password
              </CardTitle>
              <CardDescription>Use a strong password to protect exam access and submissions.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={changePassword}>
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input
                    id="currentPassword"
                    name="currentPassword"
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={handlePasswordChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={handlePasswordChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={handlePasswordChange}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  variant="outline"
                  className="border-slate-300 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900"
                  disabled={savingPassword}
                >
                  {savingPassword ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating password...
                    </>
                  ) : (
                    'Update Password'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </PortalShell>
  );
}

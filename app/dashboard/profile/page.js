'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, KeyRound, Loader2, Save, UserRound } from 'lucide-react';
import { toast } from 'sonner';

import PortalShell from '@/components/PortalShell';
import { useAuth } from '@/components/AuthProvider';
import { useMounted } from '@/hooks/use-mounted';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  changeCurrentPassword,
  fetchCurrentProfile,
  updateCurrentProfile,
} from '@/lib/profile-client';
import {
  getValidationMessage,
  passwordChangeSchema,
  profileUpdateSchema,
} from '@/lib/profile-validation';

function ReadOnlyField({ label, value }) {
  return (
    <div className="space-y-2">
      <Label className="text-muted-foreground">{label}</Label>
      <div className="rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm text-foreground">
        {value || 'Not available'}
      </div>
    </div>
  );
}

function StatusBanner({ state }) {
  if (!state?.message) {
    return null;
  }

  const tone =
    state.type === 'success'
      ? 'border-[hsl(var(--success)/0.35)] bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))]'
      : 'border-destructive/30 bg-destructive/10 text-destructive';

  return (
    <Alert className={tone}>
      <AlertDescription>{state.message}</AlertDescription>
    </Alert>
  );
}

export default function ProfilePage() {
  const { user, token, loading, refreshUser } = useAuth();
  const router = useRouter();
  const mounted = useMounted();

  const [profile, setProfile] = useState(null);
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [pageLoading, setPageLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [profileStatus, setProfileStatus] = useState({ type: '', message: '' });
  const [passwordStatus, setPasswordStatus] = useState({ type: '', message: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const loadProfile = async () => {
    if (!token) {
      setPageLoading(false);
      return;
    }

    setPageLoading(true);
    setLoadError('');

    try {
      const data = await fetchCurrentProfile(token);
      const nextProfile = data.user || null;

      setProfile(nextProfile);
      setProfileForm({
        name: nextProfile?.name || '',
        email: nextProfile?.email || '',
      });
    } catch (error) {
      const message = error.message || 'Failed to load your profile.';
      setLoadError(message);
      toast.error(message);
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    if (mounted && !loading && !user) {
      router.replace('/login');
    }
  }, [loading, mounted, router, user]);

  useEffect(() => {
    if (mounted && !loading && user && token) {
      void loadProfile();
    }
    // `loadProfile` intentionally uses the latest session token and user snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, mounted, token, user]);

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

    const validation = profileUpdateSchema.safeParse(profileForm);
    if (!validation.success) {
      const message = getValidationMessage(validation.error, 'Invalid profile details.');
      setProfileStatus({ type: 'error', message });
      toast.error(message);
      return;
    }

    setSavingProfile(true);
    setProfileStatus({ type: '', message: '' });

    try {
      const { name, email } = validation.data;
      const data = await updateCurrentProfile(token, { name, email });

      setProfile(data.user);
      setProfileForm({
        name: data.user?.name || '',
        email: data.user?.email || '',
      });

      await refreshUser();

      setProfileStatus({
        type: 'success',
        message: data.message || 'Profile updated successfully.',
      });
      toast.success(data.message || 'Profile updated successfully.');
    } catch (error) {
      const message = error.message || 'Unable to update profile.';
      setProfileStatus({ type: 'error', message });
      toast.error(message);
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();

    const validation = passwordChangeSchema.safeParse(passwordForm);
    if (!validation.success) {
      const message = getValidationMessage(validation.error, 'Invalid password details.');
      setPasswordStatus({ type: 'error', message });
      toast.error(message);
      return;
    }

    setSavingPassword(true);
    setPasswordStatus({ type: '', message: '' });

    try {
      const data = await changeCurrentPassword(token, validation.data);

      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setPasswordStatus({
        type: 'success',
        message: data.message || 'Password changed successfully.',
      });
      toast.success(data.message || 'Password changed successfully.');
    } catch (error) {
      const message = error.message || 'Unable to update password.';
      setPasswordStatus({ type: 'error', message });
      toast.error(message);
    } finally {
      setSavingPassword(false);
    }
  };

  if (!mounted || loading || pageLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">Loading profile settings...</p>
        </div>
      </div>
    );
  }

  const profileData = profile || user;
  const accountLabel = profileData?.role === 'lecturer' ? 'Lecturer Account' : 'Student Account';

  return (
    <PortalShell
      title="Profile & Settings"
      contentClassName="mx-auto max-w-5xl"
    >
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="border-border/80 bg-card/90 shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <UserRound className="h-5 w-5" />
              Account Information
            </CardTitle>
            <CardDescription>Core account details used across exams and reports.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadError ? (
              <Alert className="border-destructive/30 bg-destructive/10 text-destructive">
                <AlertDescription>{loadError}</AlertDescription>
              </Alert>
            ) : null}
            <ReadOnlyField
              label="Account Role"
              value={profileData?.role ? profileData.role.toUpperCase() : 'STUDENT'}
            />
            <ReadOnlyField label="Last Known Name" value={profileData?.name} />
            <ReadOnlyField label="Last Known Email" value={profileData?.email} />
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-3">
          <Card className="border-border/80 bg-card/90 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <CheckCircle2 className="h-5 w-5 text-[hsl(var(--success))]" />
                Edit Profile
              </CardTitle>
              <CardDescription>Update your full name and email address.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={saveProfile}>
                <StatusBanner state={profileStatus} />

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

                <Button type="submit" disabled={savingProfile}>
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

          <Card className="border-border/80 bg-card/90 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <KeyRound className="h-5 w-5 text-primary" />
                Change Password
              </CardTitle>
              <CardDescription>Use a strong password to protect exam access and submissions.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={changePassword}>
                <StatusBanner state={passwordStatus} />

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
                <Button type="submit" variant="outline" disabled={savingPassword}>
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

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bitcoin, Loader2, AlertCircle } from 'lucide-react';
import { z } from 'zod';

const authSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const Auth = () => {
  const { t } = useLanguage();
  const { user, loading: authLoading, signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const validation = authSchema.safeParse({ email, password });
      if (!validation.success) {
        setError(validation.error.errors[0].message);
        setLoading(false);
        return;
      }

      const { error } = await signIn(email, password);
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setError('Invalid email or password');
        } else {
          setError(error.message);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const validation = authSchema.safeParse({ email, password });
      if (!validation.success) {
        setError(validation.error.errors[0].message);
        setLoading(false);
        return;
      }

      if (password !== confirmPassword) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }

      const { error } = await signUp(email, password);
      if (error) {
        if (error.message.includes('User already registered')) {
          setError('This email is already registered. Please log in.');
        } else {
          setError(error.message);
        }
      } else {
        setSuccess('Account created! Please check your email to confirm your account.');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
      }
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-bitcoin-orange" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 flex items-center justify-center">
      <div className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-bitcoin-orange to-bitcoin-gold flex items-center justify-center">
            <Bitcoin className="w-10 h-10 text-background" />
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            {t.nav.login}
          </h1>
          <p className="text-muted-foreground">Access the Enthusiast Zone</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-2 text-destructive">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-lg bg-success/10 border border-success/20 text-success">
            <p className="text-sm">{success}</p>
          </div>
        )}

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="w-full bg-secondary">
            <TabsTrigger value="login" className="flex-1">Login</TabsTrigger>
            <TabsTrigger value="signup" className="flex-1">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="space-y-4 mt-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="satoshi@bitcoin.org"
                  className="bg-secondary border-border"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="bg-secondary border-border"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-bitcoin-orange to-bitcoin-gold text-background font-bold hover:shadow-[0_0_20px_hsl(var(--bitcoin-orange)/0.4)] transition-shadow"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Login'}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup" className="space-y-4 mt-6">
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="satoshi@bitcoin.org"
                  className="bg-secondary border-border"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  placeholder="••••••••"
                  className="bg-secondary border-border"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  className="bg-secondary border-border"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-bitcoin-orange to-bitcoin-gold text-background font-bold hover:shadow-[0_0_20px_hsl(var(--bitcoin-orange)/0.4)] transition-shadow"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Account'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Auth;

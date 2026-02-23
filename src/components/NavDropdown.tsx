import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { BarChart3, Shield, MessageCircle, User, LogOut, Menu } from 'lucide-react';

interface NavDropdownProps {
  avatarUrl: string | null;
  displayName: string | null;
}

export const NavDropdown: React.FC<NavDropdownProps> = ({ avatarUrl, displayName }) => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdminCheck();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon"
          className="text-primary-foreground hover:bg-primary-foreground/10 h-9 w-9">
          <Menu className="w-5 h-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 bg-popover z-50">
        <div className="flex items-center gap-3 p-3">
          <Avatar className="w-9 h-9 border border-border">
            <AvatarImage src={avatarUrl || undefined} />
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {(displayName || user?.email || '?')[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{displayName || 'Petugas'}</p>
            <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate('/dashboard')} className="gap-2 cursor-pointer">
          <BarChart3 className="w-4 h-4" /> Dashboard
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/chat')} className="gap-2 cursor-pointer">
          <MessageCircle className="w-4 h-4" /> Chat Petugas
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/profile')} className="gap-2 cursor-pointer">
          <User className="w-4 h-4" /> Profil Saya
        </DropdownMenuItem>
        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/admin')} className="gap-2 cursor-pointer text-red-600">
              <Shield className="w-4 h-4" /> Admin Panel
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="gap-2 cursor-pointer text-destructive">
          <LogOut className="w-4 h-4" /> Keluar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

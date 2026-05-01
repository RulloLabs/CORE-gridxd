import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { authService } from "@/api/authService";
import { X, Camera, Loader2, User } from "lucide-react";
import { toast } from "sonner";

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
}

const ProfileModal = ({ open, onClose }: ProfileModalProps) => {
  const { user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.user_metadata?.full_name || "");
      setAvatarUrl(user.user_metadata?.avatar_url || null);
      
      // Fetch profile from database to be sure
      authService.getProfile(user.id).then(profile => {
        if (profile) {
          if (profile.full_name) setFullName(profile.full_name);
          if (profile.avatar_url) setAvatarUrl(profile.avatar_url);
        }
      });
    }
  }, [user, open]);

  if (!open || !user) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authService.updateProfile({
        id: user.id,
        full_name: fullName,
        avatar_url: avatarUrl || undefined,
      });
      
      // Update local metadata too
      await authService.updateUserMetadata({
        full_name: fullName,
        avatar_url: avatarUrl,
      });

      toast.success("Perfil actualizado correctamente");
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Error al actualizar perfil");
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const url = await authService.uploadAvatar(user.id, file);
      setAvatarUrl(url);
      toast.success("Avatar subido");
    } catch (err: any) {
      toast.error(err.message || "Error al subir imagen");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="relative w-full max-w-md rounded-[2.5rem] border border-white/10 bg-card p-10 shadow-2xl overflow-hidden glass-card">
        <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
          <div className="w-40 h-40 bg-primary rounded-full blur-[80px]" />
        </div>

        <button 
          onClick={onClose} 
          title="Cerrar modal"
          className="absolute top-8 right-8 p-2 rounded-full hover:bg-white/5 transition-all text-muted-foreground hover:text-foreground hover:rotate-90"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-8">
          <h2 className="text-2xl font-black mb-2 tracking-tight">Mi Perfil</h2>
          <p className="text-sm text-muted-foreground">Gestiona tus datos y apariencia en GridXD</p>
        </div>

        <div className="flex justify-center mb-8">
          <div className="relative group">
            <div className="w-24 h-24 rounded-[2rem] overflow-hidden border-2 border-white/10 bg-muted flex items-center justify-center relative">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-10 h-10 text-muted-foreground" />
              )}
              {uploading && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              )}
            </div>
            <label className="absolute -bottom-2 -right-2 p-2.5 rounded-2xl bg-primary text-primary-foreground shadow-xl shadow-primary/20 cursor-pointer hover:scale-110 transition-all active:scale-95">
              <Camera className="w-4 h-4" />
              <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} disabled={uploading} />
            </label>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="user-email-field" className="text-[10px] uppercase tracking-[0.3em] font-black text-muted-foreground ml-1">Email</label>
            <input
              id="user-email-field"
              type="email"
              value={user.email}
              disabled
              title="Tu email no se puede cambiar"
              className="w-full bg-white/5 border border-white/5 p-4 rounded-2xl text-muted-foreground cursor-not-allowed opacity-50 font-bold"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="user-name-field" className="text-[10px] uppercase tracking-[0.3em] font-black text-muted-foreground ml-1">Nombre Completo</label>
            <input
              id="user-name-field"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Tu nombre"
              title="Tu nombre completo"
              className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl focus:ring-2 focus:ring-primary outline-none font-bold text-foreground transition-all focus:bg-white/10"
            />
          </div>

          <button
            type="submit"
            disabled={loading || uploading}
            className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-black text-sm uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-primary/20 glow-cyan disabled:opacity-50"
          >
            {loading ? "Guardando..." : "Guardar Cambios"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfileModal;

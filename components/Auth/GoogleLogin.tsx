
/**
 * Credits: @ahmadfuzal
 * Date: 2024-05-24
 */
import React, { useEffect, useRef, useState } from 'react';
import { User } from '../../types';
import { ShieldCheck, AlertCircle, Terminal, Globe, Info } from 'lucide-react';

interface GoogleLoginProps {
  onLoginSuccess: (user: User) => void;
  onLoginFailure: () => void;
}

const GoogleLogin: React.FC<GoogleLoginProps> = ({ onLoginSuccess, onLoginFailure }) => {
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);

  // NOTE: If you are seeing GeneralOAuthFlow error, ensure this origin is added to 
  // 'Authorized JavaScript origins' in Google Cloud Console: 
  // Current Origin: window.location.origin
  const GOOGLE_CLIENT_ID = "926254455801-ub1kn0ma6mv1vpeee137dgjro7tv7hn8.apps.googleusercontent.com";

  useEffect(() => {
    const initializeGoogleSignIn = () => {
      try {
        if ((window as any).google) {
          (window as any).google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleCredentialResponse,
            auto_select: false,
          });

          (window as any).google.accounts.id.renderButton(
            googleBtnRef.current!,
            { 
              theme: "filled_blue", 
              size: "large", 
              width: 280,
              shape: "pill",
            }
          );
        }
      } catch (error: any) {
        setInitError(error.message || "Initialization failed");
        onLoginFailure();
      }
    };

    const handleCredentialResponse = (response: any) => {
      try {
        const base64Url = response.credential.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        const payload = JSON.parse(jsonPayload);
        
        onLoginSuccess({
          id: payload.sub,
          name: payload.name,
          email: payload.email,
          picture: payload.picture,
        });
      } catch (e) {
        setInitError("Failed to parse identity token");
      }
    };

    const scriptCheck = setInterval(() => {
      if ((window as any).google) {
        clearInterval(scriptCheck);
        initializeGoogleSignIn();
      }
    }, 100);

    return () => clearInterval(scriptCheck);
  }, []);

  const handleDevBypass = () => {
    onLoginSuccess({
      id: "dev-editor",
      name: "Master Editor",
      email: "editor@gemini-resolve.local",
      picture: "https://api.dicebear.com/7.x/bottts/svg?seed=resolve"
    });
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-[#1c212b] rounded-3xl border border-slate-800 shadow-2xl max-w-sm w-full animate-in fade-in zoom-in duration-500">
      <div className="mb-8 text-center">
        <div className="w-16 h-16 bg-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-orange-900/20 rotate-6 group hover:rotate-0 transition-transform">
           <ShieldCheck className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-black tracking-tighter text-white mb-1 italic">GEMINI RESOLVE</h1>
        <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.3em]">Precision Video Mastering</p>
      </div>
      
      <div className="w-full space-y-4">
        <div ref={googleBtnRef} className="flex justify-center min-h-[44px]"></div>
        
        <div className="relative">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800"></div></div>
          <div className="relative flex justify-center text-[8px] uppercase font-bold"><span className="bg-[#1c212b] px-2 text-slate-600">Development Tools</span></div>
        </div>

        <button 
          onClick={handleDevBypass}
          className="w-full py-3 px-4 rounded-xl bg-slate-800/50 border border-slate-700 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 hover:text-orange-500 transition-all flex items-center justify-center gap-2 group"
        >
          <Terminal className="w-3 h-3 group-hover:animate-pulse" /> 
          Bypass OAuth (Dev Mode)
        </button>

        <button 
          onClick={() => setShowDebug(!showDebug)}
          className="w-full py-2 text-slate-600 text-[8px] font-bold uppercase tracking-widest hover:text-slate-400 flex items-center justify-center gap-1"
        >
          <Globe className="w-3 h-3" /> {showDebug ? 'Hide' : 'Show'} Origin Debugger
        </button>

        {showDebug && (
          <div className="p-3 bg-black/40 rounded-lg border border-slate-800 animate-in slide-in-from-top-2">
             <div className="flex items-center gap-2 text-orange-500 mb-2 font-black text-[9px] uppercase">
                <AlertCircle className="w-3 h-3" /> Why "GeneralOAuthFlow"?
             </div>
             <p className="text-[8px] text-slate-500 leading-relaxed mb-2">
                Google requires the current origin to be explicitly whitelisted in the Cloud Console.
             </p>
             <div className="bg-black p-2 rounded font-mono text-[8px] text-green-500 break-all select-all border border-green-900/30">
                {/* @ts-ignore - Accessing window.location.origin to avoid missing global definition */}
                {(window as any).location.origin}
             </div>
             <p className="text-[7px] text-slate-600 mt-2 italic font-medium">
                Copy this URL to "Authorized JavaScript origins" in your project settings.
             </p>
          </div>
        )}
      </div>

      {initError && (
        <div className="mt-4 p-2 bg-red-900/10 border border-red-500/20 rounded text-red-500 text-[8px] font-mono w-full text-center">
          {initError}
        </div>
      )}
      
      <div className="mt-8 flex items-center gap-2 text-slate-700">
         <div className="h-px w-8 bg-slate-800" />
         <Info className="w-3 h-3" />
         <div className="h-px w-8 bg-slate-800" />
      </div>
    </div>
  );
};

export default GoogleLogin;
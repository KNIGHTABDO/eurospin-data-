import React, { useState } from 'react';
import { Key, Lock, Loader, CheckCircle, XCircle } from 'lucide-react';
import { verifyLicenseKey, saveLicense } from '../services/licenseService';

interface LicenseModalProps {
  onLicenseVerified: () => void;
}

const LicenseModal: React.FC<LicenseModalProps> = ({ onLicenseVerified }) => {
  const [key, setKey] = useState('');
  const [status, setStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [message, setMessage] = useState('');

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) return;

    setStatus('checking');
    setMessage('');

    const result = await verifyLicenseKey(key.trim());

    if (result.valid) {
      saveLicense(key.trim(), result.owner || 'Utilisateur');
      setStatus('valid');
      setMessage(`Bienvenue, ${result.owner || 'Utilisateur'} !`);
      setTimeout(() => {
        onLicenseVerified();
      }, 1500);
    } else {
      setStatus('invalid');
      setMessage(result.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="bg-slate-800 p-6 text-center border-b border-slate-700">
          <div className="mx-auto w-12 h-12 bg-medical-500/20 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-6 h-6 text-medical-500" />
          </div>
          <h2 className="text-xl font-bold text-white">Activation Requise</h2>
          <p className="text-sm text-slate-400 mt-2">
            Veuillez entrer votre clé de licence pour accéder au Tuteur de Physique NeuroSpin.
          </p>
        </div>

        {/* Form */}
        <div className="p-6">
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                Clé de Licence
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder="XXXX-XXXX-XXXX"
                  className="w-full bg-black border border-slate-700 rounded-lg py-3 pl-10 pr-4 text-white placeholder-slate-600 focus:outline-none focus:border-medical-500 transition-colors font-mono"
                />
              </div>
            </div>

            {/* Status Message */}
            {status !== 'idle' && (
              <div className={`flex items-center gap-2 text-sm p-3 rounded-lg ${
                status === 'checking' ? 'bg-blue-500/10 text-blue-400' :
                status === 'valid' ? 'bg-green-500/10 text-green-400' :
                'bg-red-500/10 text-red-400'
              }`}>
                {status === 'checking' && <Loader className="w-4 h-4 animate-spin" />}
                {status === 'valid' && <CheckCircle className="w-4 h-4" />}
                {status === 'invalid' && <XCircle className="w-4 h-4" />}
                <span>{status === 'checking' ? 'Vérification...' : message}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={status === 'checking' || status === 'valid'}
              className={`w-full py-3 rounded-lg font-bold text-sm transition-all ${
                status === 'valid' 
                  ? 'bg-green-600 text-white'
                  : 'bg-medical-600 hover:bg-medical-500 text-white'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {status === 'valid' ? 'Accès Autorisé' : 'Activer le Logiciel'}
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-[10px] text-slate-600">
              Clé de démo: <span className="font-mono text-slate-500 select-all">NEURO-DEMO-2025</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LicenseModal;

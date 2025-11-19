import React from 'react';
import { Download, X, Gift } from 'lucide-react';
import { UpdateInfo } from '../services/updateService';

interface UpdateNotificationProps {
  updateInfo: UpdateInfo;
  onClose: () => void;
}

const UpdateNotification: React.FC<UpdateNotificationProps> = ({ updateInfo, onClose }) => {
  if (!updateInfo.hasUpdate) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm w-full bg-slate-800 border border-medical-500/50 rounded-xl shadow-2xl shadow-medical-500/20 overflow-hidden animate-slide-up">
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-medical-500/20 rounded-lg">
              <Gift className="w-5 h-5 text-medical-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Mise à jour disponible !</h3>
              <p className="text-xs text-medical-400 font-mono">v{updateInfo.latestVersion}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="mt-3 text-xs text-slate-300 bg-slate-900/50 p-2 rounded border border-slate-700/50">
          <p className="font-bold mb-1">Nouveautés :</p>
          <p>{updateInfo.releaseNotes}</p>
        </div>

        <div className="mt-4 flex gap-2">
          <a 
            href={updateInfo.downloadUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex-1 bg-medical-600 hover:bg-medical-500 text-white text-xs font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <Download className="w-3 h-3" /> Télécharger
          </a>
          <button 
            onClick={onClose}
            className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-bold rounded-lg transition-colors"
          >
            Plus tard
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpdateNotification;

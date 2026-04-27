import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { BookOpen, Edit3, Save, X, Lock, Globe } from 'lucide-react';

export const Rules: React.FC = () => {
  const { rules, setRules, rulesPrivate, setRulesPrivate, hasPermission } = useApp();
  const [activeTab, setActiveTab] = useState<'public' | 'private'>('public');
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');

  const canEdit = hasPermission('edit_rules');
  const canViewPrivate = hasPermission('view_private_rules');

  const currentContent = activeTab === 'public' ? rules : rulesPrivate;

  const handleStartEdit = () => {
    setEditContent(currentContent);
    setIsEditing(true);
  };

  const handleSave = () => {
    if (activeTab === 'public') {
      setRules(editContent);
    } else {
      setRulesPrivate(editContent);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditContent('');
  };

  const renderContent = (content: string) => {
    return content.split('\n').map((line, i) => {
      if (line.startsWith('# ')) return <h1 key={i} className="text-3xl font-bold mb-4 mt-6 miami-text">{line.slice(2)}</h1>;
      if (line.startsWith('## ')) return <h2 key={i} className="text-xl font-semibold mb-3 mt-5 text-pink-300">{line.slice(3)}</h2>;
      if (line.startsWith('### ')) return <h3 key={i} className="text-lg font-medium mb-2 mt-4 text-sky-300">{line.slice(4)}</h3>;
      if (line.startsWith('- ')) return <li key={i} className="text-gray-300 mb-1 ml-4 list-disc">{line.slice(2)}</li>;
      if (line.includes('**')) {
        const parts = line.split('**');
        return (
          <p key={i} className="text-gray-300 mb-2">
            {parts.map((part, j) => j % 2 === 1 ? <strong key={j} className="text-white font-semibold">{part}</strong> : part)}
          </p>
        );
      }
      if (line.trim() === '') return <div key={i} className="h-3"></div>;
      return <p key={i} className="text-gray-300 mb-2">{line}</p>;
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">
            <span style={{
              background: 'linear-gradient(135deg, #FFB6C1, #B0E0E6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Règlement
            </span>
          </h2>
          <p className="text-gray-400 mt-1">Règles et directives de la famille</p>
        </div>

        {canEdit && (
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <button onClick={handleSave} className="btn-miami px-4 py-2 rounded-lg font-medium flex items-center gap-2">
                  <Save className="w-4 h-4" />Sauvegarder
                </button>
                <button onClick={handleCancel} className="px-4 py-2 rounded-lg font-medium bg-gray-800 hover:bg-gray-700 flex items-center gap-2">
                  <X className="w-4 h-4" />Annuler
                </button>
              </>
            ) : (
              <button onClick={handleStartEdit} className="btn-miami px-4 py-2 rounded-lg font-medium flex items-center gap-2">
                <Edit3 className="w-4 h-4" />Modifier
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => { setActiveTab('public'); setIsEditing(false); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'public'
              ? 'bg-gradient-to-r from-pink-500/20 to-sky-500/20 text-white border border-pink-500/30'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          <Globe className="w-4 h-4" />
          Règlement général
        </button>

        {canViewPrivate && (
          <button
            onClick={() => { setActiveTab('private'); setIsEditing(false); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'private'
                ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-white border border-yellow-500/30'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <Lock className="w-4 h-4" />
            Section privée
          </button>
        )}
      </div>

      {/* Private badge */}
      {activeTab === 'private' && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 text-sm">
          <Lock className="w-4 h-4" />
          Section confidentielle — visible uniquement avec la permission adéquate.
        </div>
      )}

      {/* Content */}
      <div className="bg-[#12121a] rounded-2xl border border-gray-800 overflow-hidden">
        <div className="p-6 md:p-8">
          {isEditing ? (
            <div>
              <div className="mb-4 text-sm text-gray-400">
                <p>Markdown : # Titre • ## Sous-titre • **gras** • - liste</p>
              </div>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full h-96 font-mono text-sm resize-y"
                placeholder="Écrivez le règlement ici..."
              />
            </div>
          ) : (
            <div className="prose prose-invert max-w-none">
              {renderContent(currentContent)}
            </div>
          )}
        </div>
      </div>

      <div className="bg-[#12121a] rounded-xl p-4 border border-gray-800 flex items-start gap-3">
        <BookOpen className="w-5 h-5 text-pink-400 mt-0.5" />
        <div className="text-sm text-gray-400">
          <p className="font-medium text-gray-300 mb-1">À propos du règlement</p>
          <p>Ce règlement s'applique à tous les membres de la Famille Meay. Le non-respect peut entraîner des sanctions allant du simple avertissement à l'exclusion.</p>
        </div>
      </div>
    </div>
  );
};

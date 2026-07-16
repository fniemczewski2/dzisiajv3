// components/people/PersonCard.tsx
import React, { useState } from 'react';
import { Phone, Mail, CheckCircle2, Clock, ChevronDown, ChevronUp, Cake, Gift } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react'; 
import { Person } from '@/types/people';
import { EditButton, DeleteButton, ShareButton, CloseButton } from '../ui/CommonButtons';

interface PersonCardProps {
  person: Person;
  onEdit: () => void;
  onDelete: () => void;
  onLogContact: () => void;
}

export const PersonCard = ({ person, onEdit, onDelete, onLogContact }: PersonCardProps) => {
  const [showQR, setShowQR] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false); 

  const getVCardData = () => {
    let vcard = `BEGIN:VCARD\nVERSION:3.0\n`;
    vcard += `N:${person.last_name || ''};${person.first_name || ''};;;\n`;
    vcard += `FN:${person.first_name} ${person.last_name || ''}\n`;
    
    person.phones?.forEach(phone => { vcard += `TEL;TYPE=CELL:${phone}\n`; });
    person.emails?.forEach(email => { vcard += `EMAIL;TYPE=WORK,INTERNET:${email}\n`; });
    
    vcard += `END:VCARD`;
    return vcard;
  };

  return (
    <>
      <div className="card rounded-xl p-4 shadow-sm flex flex-col relative transition-all">
    
        <div 
          className="flex justify-between items-center cursor-pointer select-none"
        >
        <div className="flex flex-col">
          <h3 className="text-lg font-bold text-textPrimary">
            {person.first_name} {person.last_name}
          </h3>
          {isExpanded && person.relationship && (<p className="text-sm text-primary">{person.relationship}</p>)}
        </div>
          
          <button className="text-textSecondary" type='button' onClick={() => setIsExpanded(!isExpanded)} aria-expanded={isExpanded}>
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>

        {isExpanded && (
          <div className="flex flex-col gap-3 border-t border-gray-100 dark:border-gray-800 pt-4 animate-in fade-in slide-in-from-top-2 duration-200">
            
            <div className="flex justify-between items-start">
              {person.last_contact_date && (person.priority > 0 && person.priority < 5) && (
                <span className='flex items-center gap-2'>
                  <Clock className="w-4 h-4 text-blue-500" />
                  {new Date(person.last_contact_date).toLocaleString('pl-PL', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              )}
              <div className="flex gap-1">
                <button 
                  onClick={onLogContact}
                  className="flex-1 flex-col items-center justify-center p-1.5 sm:p-2 rounded-lg bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-500/30 transition-colors border border-green-200 dark:border-green-500/30"
                >
                  <CheckCircle2 className="w-4 h-4" />
                </button>
                <ShareButton onClick={() => setShowQR(true)} small />
                <EditButton onClick={onEdit} small />
                <DeleteButton onClick={onDelete} small />
              </div>
            </div>

            <div className="flex flex-col gap-2 mt-2">
              {person.phones?.map((phone, i) => (
                <a key={phone} href={`tel:${phone}`} className="flex items-center gap-2 text-sm text-blue-500 hover:underline">
                  <Phone className="w-4 h-4" /> {phone}
                </a>
              ))}
              {person.emails?.map((email, i) => (
                <a key={email} href={`mailto:${email}`} className="flex items-center gap-2 text-sm text-blue-500 hover:underline">
                  <Mail className="w-4 h-4" /> {email}
                </a>
              ))}
            </div>

            {person.birthday && (
              <div className="flex items-center gap-2 text-sm text-textSecondary">
                <Cake className="w-4 h-4 text-purple-500" />
                {new Date(person.birthday).toLocaleDateString('pl-PL')}
              </div>
            )}
            
            {person.nameday && ( 
              <div className="flex items-center gap-2 text-sm text-textSecondary">
                <Gift className="w-4 h-4 text-purple-500" />
                {new Date(person.nameday).toLocaleDateString('pl-PL')}
              </div>
            )}

            {person.notes && (
              <p className="text-sm text-textSecondary italic mt-2 border-t border-gray-100 dark:border-gray-800 pt-2">
                {person.notes}
              </p>
            )}

          </div>
        )}
      </div>

      {showQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface p-6 rounded-2xl shadow-xl flex flex-col items-center gap-6 max-w-sm w-full border border-gray-200 dark:border-gray-800">
            <h3 className="text-lg font-bold text-textPrimary text-center">
              Zeskanuj kod
            </h3>
            
            <div className="p-4 bg-white rounded-xl">
              <QRCodeSVG 
                value={getVCardData()} 
                size={220}
                level="M" 
              />
            </div>
            
            <CloseButton onClick={() => setShowQR(false)} />
          </div>
        </div>
      )}
    </>
  );
};
import React, { useState, useRef, useEffect } from 'react';
import { TaskDomain } from '../types';
import '../styles/domain-picker.css';

interface DomainPickerProps {
  domains: TaskDomain[];
  selectedDomainId: number | null;
  onSelect: (domainId: number | null) => void;
  language?: 'en' | 'ru';
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}

export const DomainPicker: React.FC<DomainPickerProps> = ({
  domains,
  selectedDomainId,
  onSelect,
  language = 'en',
  isOpen = false,
  onOpenChange
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [internalOpen, setInternalOpen] = useState(isOpen);
  const pickerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isControlled = onOpenChange !== undefined;
  const open = isControlled ? isOpen : internalOpen;
  const setOpen = isControlled ? onOpenChange : setInternalOpen;

  // Update internal state when controlled prop changes
  useEffect(() => {
    if (isControlled) {
      if (open && inputRef.current) {
        setTimeout(() => inputRef.current?.focus(), 0);
      }
    }
  }, [open, isControlled]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open, setOpen]);

  const selectedDomain = domains.find(d => d.id === selectedDomainId);
  
  const filteredDomains = domains.filter(domain =>
    domain.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    domain.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectDomain = (domain: TaskDomain) => {
    if (selectedDomainId === domain.id) {
      onSelect(null);
    } else {
      onSelect(domain.id);
    }
    setOpen(false);
    setSearchQuery('');
  };

  const labelText = language === 'ru' ? 'Область' : 'Domain';
  const searchPlaceholder = language === 'ru' ? 'Поиск области...' : 'Search domain...';
  const noDomains = language === 'ru' ? 'Нет доступных областей' : 'No domains available';
  const clearText = language === 'ru' ? 'Очистить' : 'Clear';

  return (
    <div className="domain-picker" ref={pickerRef}>
      <label className="domain-picker__label">{labelText}</label>
      
      <button
        className="domain-picker__trigger"
        onClick={() => setOpen(!open)}
        type="button"
      >
        {selectedDomain ? (
          <span className="domain-picker__selected">
            {selectedDomain.icon && <span className="domain-picker__icon">{selectedDomain.icon}</span>}
            {selectedDomain.name}
          </span>
        ) : (
          <span className="domain-picker__placeholder">
            {language === 'ru' ? 'Выберите область' : 'Select domain'}
          </span>
        )}
        <span className={`domain-picker__arrow ${open ? 'open' : ''}`}>▼</span>
      </button>

      {open && (
        <div className="domain-picker__dropdown">
          <div className="domain-picker__search-wrapper">
            <input
              ref={inputRef}
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="domain-picker__search"
              autoFocus
            />
          </div>

          <div className="domain-picker__list">
            {filteredDomains.length === 0 && (
              <div className="domain-picker__empty">{noDomains}</div>
            )}
            
            {filteredDomains.map(domain => (
              <button
                key={domain.id}
                className={`domain-picker__item ${selectedDomainId === domain.id ? 'selected' : ''}`}
                onClick={() => handleSelectDomain(domain)}
                type="button"
              >
                <span className="domain-picker__item-icon">
                  {selectedDomainId === domain.id && '✓'}
                  {domain.icon && <span className="domain-picker__item-emoji">{domain.icon}</span>}
                </span>
                <div className="domain-picker__item-content">
                  <div className="domain-picker__item-name">{domain.name}</div>
                  {domain.description && (
                    <div className="domain-picker__item-description">{domain.description}</div>
                  )}
                </div>
              </button>
            ))}
          </div>

          {selectedDomainId !== null && (
            <button
              className="domain-picker__clear"
              onClick={() => {
                onSelect(null);
                setOpen(false);
                setSearchQuery('');
              }}
              type="button"
            >
              ✕ {clearText}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { usePeople } from '../hooks/usePeople';
import { PersonCard } from '../components/people/PersonCard';
import { PersonForm } from '../components/people/PersonForm';
import { ImportPeople } from '../components/people/ImportPeople';
import { ExportPeople } from '../components/people/ExportPeople';
import { AddButton } from '../components/CommonButtons';
import SearchBar from '../components/SearchBar'; 
import { Person, PersonInsert } from '../types';
import LoadingState from '../components/LoadingState';
import NoResultsState from '../components/NoResultsState';
import Seo from '../components/SEO';
import { useToast } from '../providers/ToastProvider';

export default function PeoplePage() {
  const { people, loading, addPerson, editPerson, deletePerson, logContact } = usePeople();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);

  const [searchQuery, setSearchQuery] = useState('');

  const { toast } = useToast();

  const handleSave = async (data: PersonInsert | Person) => {
    if (editingPerson) {
      await editPerson(editingPerson.id, data);
    } else {
      await addPerson(data);
    }
    setIsFormOpen(false);
    setEditingPerson(null);
  };

  const handleImport = async (contacts: any[]) => {
    for (const contact of contacts) {
      await addPerson(contact);
    }
  };

  const openAddForm = () => {
    setEditingPerson(null);
    setIsFormOpen(true);
  };

  const filteredAndSortedPeople = [...people]
    .filter(person => {
      const query = searchQuery.toLowerCase();
      const fullName = `${person.first_name || ''} ${person.last_name || ''}`.toLowerCase();
      return fullName.includes(query);
    })
    .sort((a, b) => {
      const isA5 = a.priority === 5;
      const isB5 = b.priority === 5;

      if (isA5 && !isB5) return 1;  
      if (!isA5 && isB5) return -1; 

      const lastNameA = (a.last_name || '').trim().toLowerCase();
      const firstNameA = (a.first_name || '').trim().toLowerCase();
      
      const lastNameB = (b.last_name || '').trim().toLowerCase();
      const firstNameB = (b.first_name || '').trim().toLowerCase();

      const nameA = `${lastNameA} ${firstNameA}`.trim();
      const nameB = `${lastNameB} ${firstNameB}`.trim();

      return nameA.localeCompare(nameB);
    });

    const renderPeopleList = () => {
      if (loading) return (<LoadingState/>)

      if (filteredAndSortedPeople.length === 0) {
        return ( <NoResultsState text="kontaktów" isSearch={!!searchQuery} />)
      } else {
        return(
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAndSortedPeople.map((person) => (
              <PersonCard
                key={person.id}
                person={person}
                onEdit={() => setEditingPerson(person)}
                onDelete={async () => {
                  const ok = await toast.confirm('Na pewno chcesz usunąć ten kontakt?'); 
                  if(ok) {deletePerson(person.id);}
                }}
                onLogContact={() => logContact(person.id)}
              />
            ))}
          </div>
       )}
    }

  return (
    <>
      <Seo title="Osoby | Dzisiaj" description="Zarządzaj kontaktami i pamiętaj o swoich bliskich." />

      <div className="max-w-4xl mx-auto p-4 flex flex-col gap-6 pb-24">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-2xl font-bold text-textPrimary">Osoby i relacje</h1>
          
          {!isFormOpen && !editingPerson && (
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              <ExportPeople people={people} />
              <ImportPeople onImport={handleImport} />
              <AddButton onClick={openAddForm} />
            </div>
          )}
        </div>

        {!isFormOpen && !editingPerson && people.length > 0 && (
          <div className="w-full">
            <SearchBar 
              value={searchQuery} 
              onChange={(e: any) => setSearchQuery(e?.target ? e.target.value : e)} 
              placeholder="Szukaj osoby..."
            />
          </div>
        )}
        {isFormOpen || editingPerson ? (
          <PersonForm
            initialData={editingPerson}
            onSave={handleSave}
            onCancel={() => {
              setIsFormOpen(false);
              setEditingPerson(null);
            }}
          />
        ) : null}

        {!isFormOpen && !editingPerson && renderPeopleList()}
      </div>
    </>
  );
}
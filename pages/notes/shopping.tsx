import React, { useEffect, useState } from "react";
import { useShoppingLists } from "../../hooks/useShoppingLists";
import ShoppingForm from "../../components/shopping/ShoppingForm";
import ShoppingListView from "../../components/shopping/ShoppingListView";
import { AddButton } from "../../components/CommonButtons";
import { useToast } from "../../providers/ToastProvider";
import Seo from "../../components/SEO";

export default function ShoppingPage() {

  const { lists, loading, fetching, addShoppingList, editShoppingList, deleteShoppingList } = useShoppingLists();
  const [showForm, setShowForm] = useState(false);

  const openNew = () => {
    setShowForm(true);
  };

  const { toast } = useToast();
  
  useEffect(() => {
      let toastId: string | undefined;
      
      if (fetching && toast.loading) {
        toastId = toast.loading("Ładowanie list zakupów...");
      }
  
      return () => {
        if (toastId && toast.dismiss) {
          toast.dismiss(toastId);
        }
      };
  }, [fetching, toast]);

  return (
    <>
      <Seo
        title="Listy Zakupów - Dzisiaj v3"
        description="Kategoryzuj niezbędne produkty i twórz inteligentne listy zakupów."
        canonical="https://dzisiajv3.vercel.app/notes/shopping"
        keywords="zakupy, lista zakupów, planowanie zakupów, sprawunki"
      />
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-text">
            Listy zakupów
          </h2>
          {!showForm && <AddButton onClick={openNew} />}
        </div>

        {showForm && (
          <div className="mb-6">
            <ShoppingForm
              lists={lists}
              loading={loading}
              addShoppingList={addShoppingList}
              onChange={() => setShowForm(false)}
              onCancel={() => setShowForm(false)}
            />
          </div>
        )}
        
        <ShoppingListView 
          lists={lists}
          editShoppingList={editShoppingList}
          deleteShoppingList={deleteShoppingList}
        />
    </>
  );
}

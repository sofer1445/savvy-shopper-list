import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/ui/use-toast";
import { ShoppingItem } from "../types";

export const useShoppingList = () => {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [currentListId, setCurrentListId] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      createInitialList();
    }
  }, [user]);

  useEffect(() => {
    if (currentListId) {
      fetchItems();
    }
  }, [currentListId]);

  const createInitialList = async () => {
    if (!user) return;

    try {
      // First check if user has any non-archived lists
      const { data: existingLists, error: fetchError } = await supabase
        .from("shopping_lists")
        .select("id")
        .eq("created_by", user.id)
        .eq("archived", false)
        .limit(1)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (!existingLists) {
        const { data: newList, error: createError } = await supabase
          .from("shopping_lists")
          .insert({ 
            name: "רשימת קניות",
            created_by: user.id 
          })
          .select()
          .single();

        if (createError) throw createError;
        setCurrentListId(newList.id);
      } else {
        setCurrentListId(existingLists.id);
      }
    } catch (error: any) {
      console.error("Error creating/fetching list:", error);
      toast({
        title: "שגיאה",
        description: "לא ניתן היה ליצור רשימה חדשה",
        variant: "destructive",
      });
    }
  };

  const fetchItems = async () => {
    if (!currentListId) return;

    try {
      const { data, error } = await supabase
        .from("shopping_items")
        .select("*")
        .eq("list_id", currentListId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error("Error fetching items:", error);
      toast({
        title: "שגיאה",
        description: "לא ניתן היה לטעון את הפריטים",
        variant: "destructive",
      });
    }
  };

  const shareList = async (email: string, permission: 'view' | 'edit') => {
    if (!currentListId || !user) return;

    try {
      // First, get the user ID for the provided email
      const { data: userProfile, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', email)
        .single();

      if (userError) {
        toast({
          title: "שגיאה",
          description: "לא נמצא משתמש עם כתובת האימייל הזו",
          variant: "destructive",
        });
        return;
      }

      // Check if the list is already shared with this user
      const { data: existingShare, error: shareCheckError } = await supabase
        .from('list_shares')
        .select('*')
        .eq('list_id', currentListId)
        .eq('shared_with', userProfile.id)
        .single();

      if (existingShare) {
        toast({
          title: "שגיאה",
          description: "הרשימה כבר משותפת עם משתמש זה",
          variant: "destructive",
        });
        return;
      }

      // Share the list
      const { error: shareError } = await supabase
        .from('list_shares')
        .insert({
          list_id: currentListId,
          shared_with: userProfile.id,
          permission: permission,
          created_by: user.id
        });

      if (shareError) throw shareError;

      toast({
        title: "הצלחה",
        description: `הרשימה שותפה בהצלחה עם ${email}`,
      });
    } catch (error) {
      console.error("Error sharing list:", error);
      toast({
        title: "שגיאה",
        description: "לא ניתן היה לשתף את הרשימה",
        variant: "destructive",
      });
    }
  };

  return {
    items,
    setItems,
    currentListId,
    setCurrentListId,
    createInitialList,
    fetchItems,
    shareList,
  };
};
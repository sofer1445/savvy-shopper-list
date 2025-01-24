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
    if (user && !currentListId) {
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
      const { data: existingList, error: fetchError } = await supabase
        .from("shopping_lists")
        .select("id")
        .eq("created_by", user.id)
        .eq("archived", false)
        .limit(1)
        .maybeSingle();

      if (fetchError) {
        console.error("Error fetching lists:", fetchError);
        throw fetchError;
      }

      if (!existingList) {
        const { data: newList, error: createError } = await supabase
          .from("shopping_lists")
          .insert({
            name: "רשימת קניות",
            created_by: user.id,
            archived: false,
          })
          .select()
          .single();

        if (createError) throw createError;
        setCurrentListId(newList.id);
        toast({
          title: "רשימה חדשה נוצרה",
          description: "רשימת קניות חדשה נוצרה בהצלחה",
        });
      } else {
        setCurrentListId(existingList.id);
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

  return {
    items,
    setItems,
    currentListId,
    setCurrentListId,
    createInitialList,
    fetchItems,
  };
};
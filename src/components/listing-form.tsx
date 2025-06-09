
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ItemCategories, ItemConditions, ItemCondition, ItemCategory } from "@/lib/types";
import { PriceSuggestion } from "./price-suggestion";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { addMockItem, getMockCurrentUser } from "@/lib/mock-data";
import { Loader2 } from "lucide-react";

const listingFormSchema = z.object({
  name: z.string().min(3, "Le nom de l'article doit comporter au moins 3 caractères.").max(100),
  description: z.string().min(10, "La description doit comporter au moins 10 caractères.").max(1000),
  price: z.coerce.number().positive("Le prix doit être un nombre positif.").int("Le prix doit être un nombre entier pour FCFA."),
  category: z.enum(ItemCategories, { required_error: "Veuillez sélectionner une catégorie."}),
  condition: z.enum(ItemConditions, { required_error: "Veuillez sélectionner l'état de l'article."}),
  location: z.string().min(2, "Le lieu doit comporter au moins 2 caractères.").max(100).optional(),
  imageUrl: z.string().url("Veuillez entrer une URL d'image valide.").optional().or(z.literal('')),
});

type ListingFormValues = z.infer<typeof listingFormSchema>;

export function ListingForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<ListingFormValues>({
    resolver: zodResolver(listingFormSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      imageUrl: "https://placehold.co/600x400.png",
      location: "",
    },
  });

  const itemDescriptionForAISuggestion = form.watch("description");

  const handlePriceSuggested = (price: number) => {
    form.setValue("price", Math.round(price)); // FCFA usually doesn't have decimals
  };

  async function onSubmit(values: ListingFormValues) {
    setIsSubmitting(true);
    try {
      const currentUser = await getMockCurrentUser();
      if (!currentUser) {
        toast({ title: "Erreur", description: "Vous devez être connecté pour créer une annonce.", variant: "destructive" });
        router.push('/auth/signin');
        return;
      }

      const newItemData = {
        ...values,
        price: Math.round(values.price), // Ensure price is integer for FCFA
        imageUrl: values.imageUrl || 'https://placehold.co/600x400.png',
        sellerId: currentUser.id,
        dataAiHint: `${values.category} ${values.name.split(' ').slice(0,1).join('')}`.toLowerCase()
      };

      const createdItem = await addMockItem(newItemData as any); 
      
      toast({
        title: "Annonce créée !",
        description: `Votre article "${createdItem.name}" a été mis en vente avec succès.`,
      });
      router.push(`/items/${createdItem.id}`);
    } catch (error) {
      console.error("Échec de la création de l'annonce:", error);
      toast({
        title: "Erreur",
        description: "Échec de la création de l'annonce. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <div className="grid md:grid-cols-3 gap-8">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="md:col-span-2 space-y-8 p-6 border rounded-lg shadow-sm bg-card">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nom de l'article</FormLabel>
                <FormControl>
                  <Input placeholder="ex: Veste en cuir vintage" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Décrivez votre article en détail..."
                    rows={5}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid sm:grid-cols-2 gap-8">
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prix (FCFA)</FormLabel>
                  <FormControl>
                    <Input type="number" step="1" placeholder="ex: 25000" {...field} 
                      onChange={e => field.onChange(parseInt(e.target.value, 10))}
                      onBlur={e => {
                        const value = parseInt(e.target.value, 10)
                        if(!isNaN(value)) field.onChange(value)
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Catégorie</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez une catégorie" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ItemCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
           <div className="grid sm:grid-cols-2 gap-8">
            <FormField
              control={form.control}
              name="condition"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>État</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez l'état de l'article" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ItemConditions.map((condition) => (
                        <SelectItem key={condition} value={condition} className="capitalize">
                          {condition.charAt(0).toUpperCase() + condition.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Lieu (Optionnel)</FormLabel>
                    <FormControl>
                    <Input placeholder="ex: Dakar, Sénégal" {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
          </div>
          <FormField
            control={form.control}
            name="imageUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>URL de l'image (Optionnel)</FormLabel>
                <FormControl>
                  <Input placeholder="https://example.com/image.png" {...field} />
                </FormControl>
                <FormDescription>
                  Pour l'instant, veuillez fournir une URL. Le téléchargement d'images sera pris en charge ultérieurement. Par défaut, une image de remplacement est utilisée.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" size="lg" className="w-full font-bold" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? "Soumission..." : "Créer l'annonce"}
          </Button>
        </form>
      </Form>
      <div className="md:col-span-1">
        <PriceSuggestion
          itemDescription={itemDescriptionForAISuggestion}
          onPriceSuggested={handlePriceSuggested}
        />
      </div>
    </div>
  );
}

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
  name: z.string().min(3, "Item name must be at least 3 characters.").max(100),
  description: z.string().min(10, "Description must be at least 10 characters.").max(1000),
  price: z.coerce.number().positive("Price must be a positive number."),
  category: z.enum(ItemCategories, { required_error: "Please select a category."}),
  condition: z.enum(ItemConditions, { required_error: "Please select item condition."}),
  location: z.string().min(2, "Location must be at least 2 characters.").max(100).optional(),
  imageUrl: z.string().url("Please enter a valid image URL.").optional().or(z.literal('')), // Placeholder, actual upload later
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
      imageUrl: "https://placehold.co/600x400.png", // Default placeholder
      location: "",
    },
  });

  const itemDescriptionForAISuggestion = form.watch("description");

  const handlePriceSuggested = (price: number) => {
    form.setValue("price", parseFloat(price.toFixed(2)));
  };

  async function onSubmit(values: ListingFormValues) {
    setIsSubmitting(true);
    try {
      const currentUser = await getMockCurrentUser();
      if (!currentUser) {
        toast({ title: "Error", description: "You must be logged in to create a listing.", variant: "destructive" });
        router.push('/auth/signin'); // Redirect to sign-in if not logged in
        return;
      }

      // In a real app, handle image upload here and get the URL
      const newItemData = {
        ...values,
        imageUrl: values.imageUrl || 'https://placehold.co/600x400.png', // Fallback placeholder
        sellerId: currentUser.id,
        // sellerName will be added by addMockItem based on sellerId
        dataAiHint: `${values.category} ${values.name.split(' ').slice(0,1).join('')}` // Basic AI hint
      };

      const createdItem = await addMockItem(newItemData as any); // Type assertion for mock
      
      toast({
        title: "Listing Created!",
        description: `Your item "${createdItem.name}" has been listed successfully.`,
      });
      router.push(`/items/${createdItem.id}`);
    } catch (error) {
      console.error("Failed to create listing:", error);
      toast({
        title: "Error",
        description: "Failed to create listing. Please try again.",
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
                <FormLabel>Item Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Vintage Leather Jacket" {...field} />
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
                    placeholder="Describe your item in detail..."
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
                  <FormLabel>Price ($)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="e.g., 25.99" {...field} />
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
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
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
                  <FormLabel>Condition</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select item condition" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ItemConditions.map((condition) => (
                        <SelectItem key={condition} value={condition} className="capitalize">
                          {condition}
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
                    <FormLabel>Location (Optional)</FormLabel>
                    <FormControl>
                    <Input placeholder="e.g., New York, NY" {...field} />
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
                <FormLabel>Image URL (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="https://example.com/image.png" {...field} />
                </FormControl>
                <FormDescription>
                  For now, please provide a URL. Image upload will be supported later. Defaults to a placeholder.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" size="lg" className="w-full font-bold" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? "Submitting..." : "Create Listing"}
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

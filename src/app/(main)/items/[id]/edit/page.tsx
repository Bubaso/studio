
import { getItemByIdFromFirestore } from '@/services/itemService';
import { EditItemClientAuthWrapper } from './edit-item-client-auth-wrapper'; 
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';


interface EditItemPageProps {
  params: { id: string };
}

export default async function EditItemPage({ params }: EditItemPageProps) {
  const { id: itemId } = params;
  const item = await getItemByIdFromFirestore(itemId);

  if (!item) {
     return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
         <Card className="w-full max-w-md">
            <CardHeader>
                <CardTitle className="text-destructive">Article non trouvé</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">L'article que vous essayez de modifier n'existe pas ou n'a pas pu être chargé.</p>
            </CardContent>
         </Card>
        </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="text-center">
        <h1 className="text-3xl font-bold font-headline text-primary">Modifier votre annonce</h1>
        <p className="text-lg text-muted-foreground mt-2">
          Mettez à jour les détails de votre article "{item.name}".
        </p>
      </header>
      <EditItemClientAuthWrapper item={item} />
    </div>
  );
}

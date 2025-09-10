import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const MarketplaceSkeletonLoader = ({ rows = 5 }: { rows?: number }) => {
  return (
    <Card className="glass-card">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b bg-primary/5">
                <TableHead className="w-24">Buy</TableHead>
                <TableHead className="text-right w-24">Price</TableHead>
                <TableHead className="min-w-[240px]">Media</TableHead>
                <TableHead className="text-center w-16">DR</TableHead>
                <TableHead className="text-center w-20">Traffic</TableHead>
                <TableHead className="text-center min-w-[140px]">Accepts Niche</TableHead>
                <TableHead className="min-w-[120px]">Notes</TableHead>
                <TableHead className="text-center w-20">Accepts No License</TableHead>
                <TableHead className="text-center w-20">Sponsor Tag</TableHead>
                <TableHead className="w-12 text-center">Info</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: rows }).map((_, index) => (
                <TableRow key={index} className="border-b">
                  {/* Buy Button */}
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Skeleton className="h-8 w-12" />
                      <Skeleton className="h-6 w-6 rounded-full" />
                    </div>
                  </TableCell>

                  {/* Price */}
                  <TableCell className="text-right">
                    <Skeleton className="h-6 w-12 ml-auto" />
                  </TableCell>

                  {/* Media */}
                  <TableCell>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-6 w-32" />
                        <div className="flex items-center gap-1">
                          <Skeleton className="h-5 w-5" />
                          <Skeleton className="h-5 w-5" />
                          <Skeleton className="h-5 w-5" />
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <Skeleton className="h-5 w-16" />
                        <Skeleton className="h-5 w-12" />
                        <Skeleton className="h-5 w-14" />
                      </div>
                    </div>
                  </TableCell>

                  {/* DR */}
                  <TableCell className="text-center">
                    <Skeleton className="h-6 w-8 mx-auto" />
                  </TableCell>

                  {/* Traffic */}
                  <TableCell className="text-center">
                    <Skeleton className="h-5 w-12 mx-auto" />
                  </TableCell>

                  {/* Accepts Niche */}
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="flex flex-col items-center">
                          <Skeleton className="h-6 w-6 rounded" />
                          <Skeleton className="h-4 w-8 mt-1" />
                        </div>
                      ))}
                    </div>
                  </TableCell>

                  {/* Notes */}
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>

                  {/* Accepts No License */}
                  <TableCell className="text-center">
                    <Skeleton className="h-5 w-8 mx-auto" />
                  </TableCell>

                  {/* Sponsor Tag */}
                  <TableCell className="text-center">
                    <Skeleton className="h-5 w-12 mx-auto" />
                  </TableCell>

                  {/* Info */}
                  <TableCell className="text-center">
                    <Skeleton className="h-8 w-8 mx-auto" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
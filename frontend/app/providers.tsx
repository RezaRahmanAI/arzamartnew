"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppInitProvider } from "@/context/app-init-context";
import { CartProvider } from "@/lib/cart";
import { OrdersProvider } from "@/lib/orders";
import { ReviewsProvider } from "@/lib/reviews";
import { ProductsProvider } from "@/lib/products-store";
import { CategoriesProvider } from "@/lib/categories-store";
import { SettingsProvider } from "@/context/settings-context";
import { WishlistProvider } from "@/lib/wishlist";
import { CustomersProvider } from "@/lib/customers-store";
import { AuthProvider } from "@/context/auth-context";
import { BannersProvider } from "@/lib/banners-store";
import { ThemeApplier } from "@/components/theme-applier";

import { AppInitData } from "@/lib/api/services/init.service";

export function Providers({
  children,
  initialData,
}: {
  children: ReactNode;
  initialData?: AppInitData;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AppInitProvider initialData={initialData}>
        <SettingsProvider>
          <CustomersProvider>
            <AuthProvider>
              <ThemeApplier />
              <BannersProvider>
                <CategoriesProvider>
                  <ProductsProvider>
                    <OrdersProvider>
                      <ReviewsProvider>
                        <WishlistProvider>
                          <CartProvider>{children}</CartProvider>
                        </WishlistProvider>
                      </ReviewsProvider>
                    </OrdersProvider>
                  </ProductsProvider>
                </CategoriesProvider>
              </BannersProvider>
            </AuthProvider>
          </CustomersProvider>
        </SettingsProvider>
      </AppInitProvider>
    </QueryClientProvider>
  );
}

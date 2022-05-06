import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

const storageKey = '@RocketShoes:cart';

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem(storageKey)

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const hasStock = async (productId: number) => {
    const response = await api.get(`stock/${productId}`);
    const { data } = response

    return data as Stock
  }

  const addProduct = async (productId: number) => {
    try {
      const response = await api.get(`products/${productId}`);
      const stock = await hasStock(productId);
      const { data } = response

      const productIsAlreadyInCart = cart.find(cart => cart.id === productId);

      const stockAmount = stock.amount;
      const currentAmount = productIsAlreadyInCart ? productIsAlreadyInCart.amount : 0;
      const amount = currentAmount + 1;

      const updatedCart = [...cart];

      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return
      }

      if (productIsAlreadyInCart) {
        productIsAlreadyInCart.amount = amount;
      } else {

        const newProduct = {
          ...data,
          amount: 1
        }
        updatedCart.push(newProduct);
      }
      setCart(updatedCart);
      localStorage.setItem(storageKey, JSON.stringify(updatedCart));
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const findProduct = cart.find(item => item.id === productId);
      if (!findProduct) {
        toast.error('Erro na remoção do produto');
        return
      }

      const filterProducts = cart.filter(cart => cart.id !== productId);
      setCart(filterProducts);
      localStorage.setItem(storageKey, JSON.stringify(filterProducts))
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const findProduct = cart.find(item => item.id === productId);
      if (!findProduct) {
        toast.error('Erro na alteração de quantidade do produto');
        return
      }

      if (!amount) return

      const stock = await hasStock(productId);
      if (stock.amount < amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return
      }

      const updateCart = cart.map(item => ({
        ...item,
        amount: (item.id === productId ? amount : item.amount)
      }))
      setCart(updateCart);
      localStorage.setItem(storageKey, JSON.stringify(updateCart));
    } catch {
      toast.error('Quantidade solicitada fora de estoque');
    }
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        addProduct,
        removeProduct,
        updateProductAmount
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}

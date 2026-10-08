import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { productApi } from '../services/endpoints'

/** Loads ?product=<id> and passes it to setProduct once when it arrives (used by stock forms). */
export function usePresetProduct(setProduct) {
  const [params] = useSearchParams()
  const id = params.get('product')
  const setter = useRef(setProduct)
  setter.current = setProduct

  const { data } = useQuery({
    queryKey: ['products', 'detail', id],
    queryFn: () => productApi.get(id).then((r) => r.data),
    enabled: !!id,
    staleTime: 0,
  })
  useEffect(() => {
    if (data) setter.current(data)
  }, [data])
}

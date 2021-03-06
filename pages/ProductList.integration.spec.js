import { mount } from '@vue/test-utils';
import axios from '@nuxtjs/axios';
import Vue from 'vue';

import ProductList from './index.vue';
import ProductCard from '@/components/ProductCard';
import Search from '@/components/Search';

import { makeServer } from '@/miragejs/server';

jest.mock('@nuxtjs/axios', () => ({
  get: jest.fn(),
}));

describe('ProductList - integration', () => {
  let server;

  beforeEach(() => {
    server = makeServer({ environment: 'test' });
  });

  afterEach(() => {
    server.shutdown();
    jest.clearAllMocks();
  });

  const getProducts = (quantity = 10, overrides = []) => {
    let overrideList = [];

    if (overrides.length) {
      overrideList = overrides.map((override) =>
        server.create('product', override)
      );
    }

    const products = [
      ...server.createList('product', quantity),
      ...overrideList,
    ];

    return products;
  };

  const mountProductList = async (
    quantity = 10,
    overrides = [],
    shouldReject = false
  ) => {
    const products = getProducts(quantity, overrides);

    axios.get.mockReturnValue(
      shouldReject
        ? Promise.reject(new Error('error'))
        : Promise.resolve({ data: { products } })
    );

    const wrapper = mount(ProductList, {
      mocks: {
        $axios: axios,
      },
    });

    await Vue.nextTick();

    return { wrapper, products };
  };

  it('should mount the component', async () => {
    const { wrapper } = await mountProductList();
    expect(wrapper.vm).toBeDefined();
  });

  it('should mount the Search component as a child', async () => {
    const { wrapper } = await mountProductList();
    expect(wrapper.findComponent(Search)).toBeDefined();
  });

  it('should call axios.get on component mount', async () => {
    await mountProductList();

    expect(axios.get).toHaveBeenCalledTimes(1);
    expect(axios.get).toHaveBeenCalledWith('/api/products');
  });

  it('should mount the ProductCard component as a child 10 times', async () => {
    const { wrapper } = await mountProductList();

    const cards = wrapper.findAllComponents(ProductCard);

    expect(cards).toHaveLength(10);
  });

  it('should display the error message when Promise rejects', async () => {
    const errorMessage = 'Problemas ao carregar a lista!';
    const { wrapper } = await mountProductList(10, [], true);

    expect(wrapper.text()).toContain(errorMessage);
  });

  it('should filter the product list when a search is performed', async () => {
    // Arrange
    const { wrapper } = await mountProductList(10, [
      {
        title: 'Best Watch Ever',
      },
      {
        title: 'Second Best Watch Ever',
      },
    ]);

    // Act
    const search = wrapper.findComponent(Search);
    search.find('input[type="search"]').setValue('Watch');
    await search.find('form').trigger('submit');

    // Assert
    const cards = wrapper.findAllComponents(ProductCard);
    expect(wrapper.vm.searchTerm).toEqual('Watch');
    expect(cards).toHaveLength(2);
  });

  it('should return all product when the search term is cleared', async () => {
    // Arrange
    const { wrapper } = await mountProductList(10, [
      {
        title: 'Best Watch Ever',
      },
    ]);

    // Act
    const search = wrapper.findComponent(Search);
    search.find('input[type="search"]').setValue('Watch');
    await search.find('form').trigger('submit');
    search.find('input[type="search"]').setValue('');
    await search.find('form').trigger('submit');

    // Assert
    const cards = wrapper.findAllComponents(ProductCard);
    expect(wrapper.vm.searchTerm).toEqual('');
    expect(cards).toHaveLength(11);
  });

  it('should display the total quantity of products', async () => {
    const { wrapper } = await mountProductList(27);
    const quantity = wrapper.find('[data-testid="total-quantity-label"]');

    expect(quantity.text()).toEqual('27 Products');
  });

  it('should display product (singular) when there is only 1 product', async () => {
    const { wrapper } = await mountProductList(1);
    const quantity = wrapper.find('[data-testid="total-quantity-label"]');

    expect(quantity.text()).toEqual('1 Product');
  });
});

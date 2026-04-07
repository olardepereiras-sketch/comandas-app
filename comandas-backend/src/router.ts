import { createTRPCRouter } from './context';
import { createOrderProcedure } from './routes/orders/create';
import { listOrdersProcedure } from './routes/orders/list';
import { getOrderProcedure } from './routes/orders/get';
import { updateOrderProcedure } from './routes/orders/update';
import { addItemProcedure } from './routes/items/add';
import { updateItemProcedure } from './routes/items/update';
import { removeItemProcedure } from './routes/items/remove';
import { getFloorPlanProcedure } from './routes/floor-plan/get';
import { saveFloorPlanProcedure } from './routes/floor-plan/save';

export const appRouter = createTRPCRouter({
  comandas: createTRPCRouter({
    createOrder: createOrderProcedure,
    listOrders: listOrdersProcedure,
    getOrder: getOrderProcedure,
    updateOrder: updateOrderProcedure,
    addItem: addItemProcedure,
    updateItem: updateItemProcedure,
    removeItem: removeItemProcedure,
    getFloorPlan: getFloorPlanProcedure,
    saveFloorPlan: saveFloorPlanProcedure,
  }),
});

export type AppRouter = typeof appRouter;

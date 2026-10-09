import type { Order } from "../types";
import { formatDateCN } from "../utils/date";
import type { IntakeResult } from "../utils/nutrition";

interface DayDetailProps {
  date: string;
  orders: Order[];
  intake: IntakeResult;
}

export function DayDetail({ date, orders, intake }: DayDetailProps) {
  return (
    <div className="detail">
      <h3 className="detail__title">{formatDateCN(date)}</h3>

      <section className="detail__block">
        <h4>
          🍟 消费记录
          {orders.length > 0 ? <span className="badge">{orders.length} 单</span> : null}
        </h4>
        {orders.length > 0 ? (
          <ul className="order-list">
            {orders.map((order) => (
              <li key={order.orderId} className="order">
                <div className="order__top">
                  <span className="order__store">{order.storeName}</span>
                  <span className="order__amount">¥{order.realTotalAmount}</span>
                </div>
                <div className="order__meta">
                  {order.createTime.slice(11, 16)} · {order.orderStatus}
                </div>
                <div className="order__items">
                  {order.orderProductList.map((product) => (
                    <span key={product.productCode} className="chip">
                      {product.productName} ×{product.quantity}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty">这一天没有麦当劳消费记录</p>
        )}
      </section>

      <section className="detail__block">
        <h4>
          🥗 营养拆解
          <span className="badge">
            {intake.matchedCount}/{intake.totalCount} 项已识别
          </span>
        </h4>
        {intake.items.length > 0 ? (
          <ul className="intake-list">
            {intake.items.map((item, index) => (
              <li key={`${item.name}-${index}`} className={item.food ? undefined : "is-unknown"}>
                <span className="intake__name">
                  {item.name} ×{item.quantity}
                </span>
                <span className="intake__value">
                  {item.food
                    ? `${Math.round(item.food.energyKcal * item.quantity)} kcal`
                    : "无营养数据"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty">这一天没有可分析的餐品</p>
        )}
      </section>
    </div>
  );
}

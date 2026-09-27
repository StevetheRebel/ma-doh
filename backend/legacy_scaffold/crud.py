from sqlmodel import Session, select
from .models import Transaction

def create_transaction(session: Session, tx: Transaction) -> Transaction:
    session.add(tx)
    session.commit()
    session.refresh(tx)
    return tx

def list_transactions(session: Session, limit: int = 100):
    statement = select(Transaction).limit(limit)
    results = session.exec(statement).all()
    return results

def get_transaction(session: Session, tx_id: int):
    statement = select(Transaction).where(Transaction.id == tx_id)
    return session.exec(statement).first()

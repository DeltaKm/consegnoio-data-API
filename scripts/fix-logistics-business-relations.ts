import prisma from '../app/lib/prisma';

async function fixLogisticsBusinessRelations() {
  try {
    const logisticsId = "68dfcd7bf67335a48ef550b2"; // Carlo Logistica
    const businessIds = [
      "68e3d6cefcc217363e574446",
      "68e3d705fcc217363e574448"
    ];

    console.log('🔧 Fixing LogisticsBusiness relations...\n');

    for (const businessId of businessIds) {
      // Verifica se la relazione esiste già
      const existingRelation = await prisma.logisticsBusiness.findFirst({
        where: {
          logisticsId: logisticsId,
          businessId: businessId,
        }
      });

      if (existingRelation) {
        console.log(`✅ Relazione già esistente per business ${businessId}`);
        continue;
      }

      // Crea la relazione
      const relation = await prisma.logisticsBusiness.create({
        data: {
          logisticsId: logisticsId,
          businessId: businessId,
        },
        include: {
          business: {
            select: {
              bussinesName: true,
            }
          }
        }
      });

      console.log(`✅ Relazione creata per business: ${relation.business.bussinesName} (${businessId})`);
    }

    console.log('\n🎉 Operazione completata con successo!');
    console.log('\nOra la logistica Carlo può vedere i suoi 2 business nella lista.');

  } catch (error) {
    console.error('❌ Errore:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixLogisticsBusinessRelations();

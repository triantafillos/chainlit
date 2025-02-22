import { runTestServer } from '../../support/testUtils';

describe('plotly', () => {
  before(() => {
    runTestServer();
  });

  it('should be able to display an inline chart', () => {
    cy.get('.message').should('have.length', 1);
    cy.get('.message').eq(0).find('.inline-plotly').should('have.length', 1);
  });
});

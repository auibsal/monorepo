import * as React from 'react';
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface ManuscriptDecisionProps {
  authorName: string;
  manuscriptTitle: string;
  status: 'accepted' | 'rejected' | 'revisions_requested';
}

/**
 * ManuscriptDecisionTemplate
 *
 * @description Standardized execution for ManuscriptDecisionTemplate.
 */
export const ManuscriptDecisionTemplate: React.FC<ManuscriptDecisionProps> = ({
  authorName,
  manuscriptTitle,
  status,
}) => {
  const isAccepted = status === 'accepted';
  const isRevisions = status === 'revisions_requested';
  
  const statusColor = isAccepted ? '#10B981' : isRevisions ? '#F59E0B' : '#EF4444';
  const statusText = isAccepted ? 'ACCEPTED' : isRevisions ? 'REVISIONS REQUESTED' : 'REJECTED';

  return (
    <Html>
      <Head />
      <Preview>Update regarding your submission: {manuscriptTitle}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Architectural Header */}
          <Section style={header}>
            <Text style={societyName}>AUIB SOCIETY OF ARTS AND LETTERS</Text>
          </Section>

          <Section style={content}>
            <Heading style={title}>Editorial Decision Matrix</Heading>
            <Text style={text}>Dear {authorName},</Text>
            <Text style={text}>
              The editorial board has completed the review phase for your manuscript,{' '}
              <strong style={strong}>"{manuscriptTitle}"</strong>.
            </Text>

            {/* Brutalist Status Block */}
            <Section style={{ ...statusBlock, borderLeft: `6px solid ${statusColor}` }}>
              <Text style={statusLabel}>CURRENT STATUS:</Text>
              <Text style={{ ...statusValue, color: statusColor }}>{statusText}</Text>
            </Section>

            {isAccepted && (
              <Text style={text}>
                Your work has been selected for publication. Our editorial team will contact you shortly to begin the final formatting and archival process.
              </Text>
            )}

            {!isAccepted && !isRevisions && (
              <Text style={text}>
                We regret to inform you that your manuscript has not been selected for publication at this time. The board reviewed a high volume of submissions and had to make difficult protocol decisions.
              </Text>
            )}

            {isRevisions && (
              <Text style={text}>
                The board recognizes the structural integrity of your manuscript but requires revisions before a final determination can be made. Please check the Nexus portal for detailed rubric feedback.
              </Text>
            )}

            <Section style={buttonContainer}>
              <Link href="https://nexus.auibsal.org/login" style={button}>
                ACCESS NEXUS PORTAL
              </Link>
            </Section>

            <Hr style={hr} />
            <Text style={footer}>
              This is a mathematically automated transmission from the AUIB Society of Arts and Letters infrastructure. Do not reply to this email.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

// --- Brutalist Inline CSS Variables ---
const main = {
  backgroundColor: '#f5f5f5',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '40px auto',
  border: '4px solid #000000',
  boxShadow: '8px 8px 0px 0px #000000',
  maxWidth: '600px',
};

const header = {
  backgroundColor: '#000000',
  padding: '24px',
  textAlign: 'center' as const,
};

const societyName = {
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 'bold',
  letterSpacing: '2px',
  margin: '0',
};

const content = {
  padding: '32px',
};

const title = {
  fontSize: '24px',
  fontWeight: '900',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
  marginBottom: '24px',
};

const text = {
  fontSize: '16px',
  lineHeight: '26px',
  color: '#000000',
};

const strong = {
  fontWeight: 'bold',
};

const statusBlock = {
  backgroundColor: '#f9f9f9',
  padding: '20px',
  margin: '32px 0',
  border: '2px solid #000000',
};

const statusLabel = {
  fontSize: '12px',
  fontWeight: 'bold',
  letterSpacing: '1px',
  margin: '0 0 4px 0',
  color: '#666666',
};

const statusValue = {
  fontSize: '20px',
  fontWeight: '900',
  letterSpacing: '2px',
  margin: '0',
};

const buttonContainer = {
  marginTop: '40px',
  marginBottom: '40px',
};

const button = {
  backgroundColor: '#000000',
  color: '#ffffff',
  padding: '16px 32px',
  fontWeight: 'bold',
  letterSpacing: '2px',
  textDecoration: 'none',
  display: 'inline-block',
  border: '2px solid #000000',
};

const hr = {
  borderColor: '#000000',
  borderWidth: '2px',
  margin: '40px 0 20px 0',
};

const footer = {
  fontSize: '12px',
  color: '#666666',
  letterSpacing: '1px',
  textTransform: 'uppercase' as const,
  lineHeight: '1.5',
};
